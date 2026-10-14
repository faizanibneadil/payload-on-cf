import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import type { PlaygroundFile, User } from '@/payload-types'
import { MAX_NODES_PER_PLAYGROUND } from './file-rules'
import { isTempId, sortParentsFirst, type TreeNode, validateTree } from './playground-tree'

// Server-side helpers. Har write `overrideAccess: false` + user ke saath hota hai,
// taake Payload ka access control hi final authority rahe.

export const getPayloadClient = () => getPayload({ config })

const asId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return String((value as { id: number | string }).id)
  return String(value)
}

export const toTreeNode = (doc: PlaygroundFile): TreeNode => ({
  id: String(doc.id),
  parentId: asId(doc.parent),
  name: doc.name,
  type: doc.type === 'folder' ? 'folder' : 'file',
  content: doc.content ?? '',
})

export async function fetchNodes(
  payload: Payload,
  playgroundId: number | string,
): Promise<TreeNode[]> {
  const result = await payload.find({
    collection: 'playground-files',
    where: { playground: { equals: playgroundId } },
    limit: MAX_NODES_PER_PLAYGROUND + 20,
    pagination: false,
    depth: 0,
    overrideAccess: false,
  })
  return result.docs.map(toTreeNode)
}

export const isOwnerOf = (playground: { owner: unknown }, user: User | null | undefined) =>
  Boolean(user && (user.role === 'admin' || asId(playground.owner) === String(user.id)))

/** Naye nodes ko parent-first order me create karta hai; temp id -> real id map return karta hai */
export async function createNodes(
  payload: Payload,
  user: User,
  playgroundId: number | string,
  nodes: TreeNode[],
): Promise<Map<string, string>> {
  const idMap = new Map<string, string>()
  for (const node of sortParentsFirst(nodes)) {
    const parent = node.parentId ? (idMap.get(node.parentId) ?? node.parentId) : null
    const created = await payload.create({
      collection: 'playground-files',
      data: {
        playground: Number(playgroundId),
        name: node.name,
        type: node.type,
        content: node.type === 'file' ? node.content : '',
        size: 0,
        parent: parent ? Number(parent) : null,
      },
      depth: 0,
      user,
      overrideAccess: false,
    })
    idMap.set(node.id, String(created.id))
  }
  return idMap
}

export interface SaveChanges {
  theory?: unknown
  upserts: TreeNode[]
  deletes: string[]
}

/** Client ke dirty changes ko DB tree par apply karta hai (validate -> delete -> create -> update) */
export async function applyChanges(
  payload: Payload,
  user: User,
  playgroundId: number | string,
  changes: SaveChanges,
): Promise<void> {
  const existing = await fetchNodes(payload, playgroundId)
  const working = new Map(existing.map((n) => [n.id, n]))

  for (const id of changes.deletes) working.delete(id)

  for (const node of changes.upserts) {
    // Doosre playground ke id se tampering rokna: non-temp id lazmi is playground me ho
    if (!isTempId(node.id) && !working.has(node.id) && !existing.some((e) => e.id === node.id)) {
      throw new Error('Unknown file or folder')
    }
    working.set(node.id, node)
  }

  // Deleted folder ke bache hue children bhi hata do
  let removed = true
  while (removed) {
    removed = false
    for (const node of [...working.values()]) {
      if (node.parentId && !working.has(node.parentId) && !isTempId(node.parentId)) {
        working.delete(node.id)
        removed = true
      }
    }
  }

  const finalNodes = [...working.values()]
  const error = validateTree(finalNodes)
  if (error) throw new Error(error)

  // 1) Deletes — deepest pehle (parent FK)
  const finalIds = new Set(finalNodes.map((n) => n.id))
  const toDelete = sortParentsFirst(existing.filter((n) => !finalIds.has(n.id))).reverse()
  for (const node of toDelete) {
    await payload.delete({
      collection: 'playground-files',
      id: node.id,
      user,
      overrideAccess: false,
    })
  }

  // 2) Creates
  const idMap = await createNodes(
    payload,
    user,
    playgroundId,
    finalNodes.filter((n) => isTempId(n.id)),
  )

  // 3) Updates (sirf jo actually badle)
  const before = new Map(existing.map((n) => [n.id, n]))
  for (const node of changes.upserts) {
    const old = before.get(node.id)
    if (!old || !finalIds.has(node.id)) continue
    const nextParent = node.parentId ? (idMap.get(node.parentId) ?? node.parentId) : null
    const data: Record<string, unknown> = {}
    if (old.name !== node.name) data.name = node.name
    if (old.parentId !== nextParent) data.parent = nextParent ? Number(nextParent) : null
    if (node.type === 'file' && old.content !== node.content) data.content = node.content
    if (Object.keys(data).length === 0) continue
    await payload.update({
      collection: 'playground-files',
      id: node.id,
      data,
      depth: 0,
      user,
      overrideAccess: false,
    })
  }

  // 4) Theory (sirf owner — playgrounds update access enforce karta hai)
  if (changes.theory !== undefined) {
    await payload.update({
      collection: 'playgrounds',
      id: playgroundId,
      data: { theory: changes.theory as Record<string, unknown> },
      depth: 0,
      user,
      overrideAccess: false,
    })
  }
}
