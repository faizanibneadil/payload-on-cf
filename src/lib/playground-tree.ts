// Files/folders tree ke pure helpers — client aur server dono me use hote hain
import {
  byteLength,
  MAX_DEPTH,
  MAX_FILE_BYTES,
  MAX_NODES_PER_PLAYGROUND,
  validateNodeName,
} from './file-rules'

export type NodeType = 'file' | 'folder'

export interface TreeNode {
  /** DB id (string) ya naye node ke liye `new-...` temp id */
  id: string
  parentId: string | null
  name: string
  type: NodeType
  content: string
}

export const isTempId = (id: string) => id.startsWith('new-')

export const newTempId = () => `new-${Math.random().toString(36).slice(2, 10)}`

export function childrenOf(nodes: TreeNode[], parentId: string | null): TreeNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })
}

export function depthOf(nodes: TreeNode[], id: string): number {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  let depth = 0
  let cursor = byId.get(id)
  while (cursor?.parentId && depth < 50) {
    depth++
    cursor = byId.get(cursor.parentId)
  }
  return depth
}

/** Node ke saare descendants (folder delete/move ke liye) */
export function descendantsOf(nodes: TreeNode[], id: string): TreeNode[] {
  const out: TreeNode[] = []
  const stack = [id]
  while (stack.length) {
    const current = stack.pop() as string
    for (const child of nodes) {
      if (child.parentId === current) {
        out.push(child)
        stack.push(child.id)
      }
    }
  }
  return out
}

/** id -> "/folder/file.ext" */
export function buildPathMap(nodes: TreeNode[]): Map<string, string> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const paths = new Map<string, string>()
  for (const node of nodes) {
    const parts: string[] = []
    let cursor: TreeNode | undefined = node
    let guard = 0
    while (cursor && guard++ < 50) {
      parts.unshift(cursor.name)
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
    }
    paths.set(node.id, `/${parts.join('/')}`)
  }
  return paths
}

/** Preview ke liye { "/css/app.css": "..." } map (sirf files) */
export function toPreviewFiles(nodes: TreeNode[]): Record<string, string> {
  const paths = buildPathMap(nodes)
  const files: Record<string, string> = {}
  for (const node of nodes) {
    if (node.type === 'file') files[paths.get(node.id) as string] = node.content
  }
  return files
}

export function hasSiblingNamed(
  nodes: TreeNode[],
  parentId: string | null,
  name: string,
  ignoreId?: string,
): boolean {
  const lower = name.toLowerCase()
  return nodes.some(
    (n) => n.parentId === parentId && n.id !== ignoreId && n.name.toLowerCase() === lower,
  )
}

/** Parent pehle, child baad me — create ke liye */
export function sortParentsFirst<T extends { id: string; parentId: string | null }>(
  nodes: T[],
): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const depth = (n: T) => {
    let d = 0
    let cursor: T | undefined = n
    while (cursor?.parentId && d < 50) {
      d++
      cursor = byId.get(cursor.parentId)
    }
    return d
  }
  return [...nodes].sort((a, b) => depth(a) - depth(b))
}

/** Poora tree save/fork se pehle validate karo. Error message ya null. */
export function validateTree(nodes: TreeNode[]): string | null {
  if (nodes.length > MAX_NODES_PER_PLAYGROUND) {
    return `A playground can hold at most ${MAX_NODES_PER_PLAYGROUND} files and folders`
  }
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const seen = new Set<string>()

  for (const node of nodes) {
    const nameCheck = validateNodeName(node.name)
    if (nameCheck !== true) return `"${node.name}": ${nameCheck}`
    if (node.type !== 'file' && node.type !== 'folder') return 'Invalid node type'
    if (node.type === 'file' && byteLength(node.content) > MAX_FILE_BYTES) {
      return `"${node.name}" exceeds ${MAX_FILE_BYTES / 1024} KB`
    }

    if (node.parentId) {
      const parent = byId.get(node.parentId)
      if (!parent) return `"${node.name}" has a missing parent folder`
      if (parent.type !== 'folder') return `"${parent.name}" is not a folder`
    }

    const key = `${node.parentId ?? ''}/${node.name.toLowerCase()}`
    if (seen.has(key)) return `"${node.name}" already exists in this folder`
    seen.add(key)

    // cycle + depth check
    let depth = 0
    let cursor: TreeNode | undefined = node
    while (cursor?.parentId) {
      depth++
      if (depth > MAX_DEPTH) return `Folders can be nested at most ${MAX_DEPTH} levels`
      cursor = byId.get(cursor.parentId)
    }
  }
  return null
}
