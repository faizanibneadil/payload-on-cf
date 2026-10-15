'use client'

import { useCallback, useMemo, useReducer } from 'react'
import { validateNodeName } from '@/lib/file-rules'
import {
  buildPathMap,
  descendantsOf,
  hasSiblingNamed,
  isTempId,
  newTempId,
  type TreeNode,
  toPreviewFiles,
} from '@/lib/playground-tree'

// Playground ki poori client-side state ek jagah: files tree, theory, title, open tabs.
// "base" last saved snapshot hai — dirty check aur save diff dono isi se banta hai.

interface State {
  nodes: TreeNode[]
  base: TreeNode[]
  title: string
  baseTitle: string
  theory: unknown
  theoryDirty: boolean
  activeId: string | null
  openIds: string[]
}

type Action =
  | { type: 'open'; id: string }
  | { type: 'close'; id: string }
  | { type: 'content'; id: string; content: string }
  | { type: 'add'; node: TreeNode; open: boolean }
  | { type: 'rename'; id: string; name: string }
  | { type: 'remove'; id: string }
  | { type: 'title'; title: string }
  | { type: 'theory'; theory: unknown }
  | { type: 'saved'; nodes: TreeNode[]; title?: string }

const firstFileId = (nodes: TreeNode[]): string | null => {
  const preferred = nodes.find(
    (n) => n.type === 'file' && n.parentId === null && /^index\./i.test(n.name),
  )
  return (preferred ?? nodes.find((n) => n.type === 'file'))?.id ?? null
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'open': {
      const openIds = state.openIds.includes(action.id)
        ? state.openIds
        : [...state.openIds, action.id]
      return { ...state, activeId: action.id, openIds }
    }
    case 'close': {
      const idx = state.openIds.indexOf(action.id)
      if (idx === -1) return state
      const openIds = state.openIds.filter((id) => id !== action.id)
      let activeId = state.activeId
      if (activeId === action.id) activeId = openIds[Math.min(idx, openIds.length - 1)] ?? null
      return { ...state, openIds, activeId }
    }
    case 'content':
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.id ? { ...n, content: action.content } : n)),
      }
    case 'add': {
      const nodes = [...state.nodes, action.node]
      if (!action.open) return { ...state, nodes }
      return {
        ...state,
        nodes,
        activeId: action.node.id,
        openIds: [...state.openIds, action.node.id],
      }
    }
    case 'rename':
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.id ? { ...n, name: action.name } : n)),
      }
    case 'remove': {
      const gone = new Set([action.id, ...descendantsOf(state.nodes, action.id).map((n) => n.id)])
      const openIds = state.openIds.filter((id) => !gone.has(id))
      const activeId =
        state.activeId && gone.has(state.activeId)
          ? (openIds[openIds.length - 1] ?? null)
          : state.activeId
      return { ...state, nodes: state.nodes.filter((n) => !gone.has(n.id)), openIds, activeId }
    }
    case 'title':
      return { ...state, title: action.title }
    case 'theory':
      return { ...state, theory: action.theory, theoryDirty: true }
    case 'saved': {
      // Save ke baad temp ids real ids se badal jate hain — path se purane tabs map karo
      const oldPaths = buildPathMap(state.nodes)
      const newByPath = new Map<string, string>()
      for (const [id, path] of buildPathMap(action.nodes)) newByPath.set(path, id)
      const remap = (id: string | null) => {
        if (!id) return null
        const path = oldPaths.get(id)
        return (path && newByPath.get(path)) ?? null
      }
      const openIds = state.openIds.map(remap).filter((id): id is string => id !== null)
      const activeId = remap(state.activeId) ?? openIds[0] ?? firstFileId(action.nodes)
      return {
        ...state,
        nodes: action.nodes,
        base: action.nodes,
        title: action.title ?? state.title,
        baseTitle: action.title ?? state.baseTitle,
        theoryDirty: false,
        openIds: activeId && !openIds.includes(activeId) ? [...openIds, activeId] : openIds,
        activeId,
      }
    }
    default:
      return state
  }
}

export interface PlaygroundInit {
  nodes: TreeNode[]
  title: string
  theory: unknown
}

/** Server ko bhejne ke liye changes: naye/badle hue nodes + hata diye gaye ids */
export function diffNodes(base: TreeNode[], nodes: TreeNode[]) {
  const before = new Map(base.map((n) => [n.id, n]))
  const upserts = nodes.filter((n) => {
    const old = before.get(n.id)
    if (!old) return true
    return old.name !== n.name || old.parentId !== n.parentId || old.content !== n.content
  })
  const current = new Set(nodes.map((n) => n.id))
  const deletes = base.filter((n) => !current.has(n.id)).map((n) => n.id)
  return { upserts, deletes }
}

export function usePlaygroundState(init: PlaygroundInit) {
  const [state, dispatch] = useReducer(reducer, init, (i): State => {
    const first = firstFileId(i.nodes)
    return {
      nodes: i.nodes,
      base: i.nodes,
      title: i.title,
      baseTitle: i.title,
      theory: i.theory,
      theoryDirty: false,
      activeId: first,
      openIds: first ? [first] : [],
    }
  })

  const { upserts, deletes } = useMemo(
    () => diffNodes(state.base, state.nodes),
    [state.base, state.nodes],
  )
  const dirty =
    upserts.length > 0 || deletes.length > 0 || state.theoryDirty || state.title !== state.baseTitle

  const previewFiles = useMemo(() => toPreviewFiles(state.nodes), [state.nodes])

  const open = useCallback((id: string) => dispatch({ type: 'open', id }), [])
  const close = useCallback((id: string) => dispatch({ type: 'close', id }), [])
  const setContent = useCallback(
    (id: string, content: string) => dispatch({ type: 'content', id, content }),
    [],
  )
  const setTitle = useCallback((title: string) => dispatch({ type: 'title', title }), [])
  const setTheory = useCallback((theory: unknown) => dispatch({ type: 'theory', theory }), [])
  const markSaved = useCallback(
    (nodes: TreeNode[], title?: string) => dispatch({ type: 'saved', nodes, title }),
    [],
  )
  const remove = useCallback((id: string) => dispatch({ type: 'remove', id }), [])

  // Error message return karte hain (FileExplorer inhe inline dikhata hai), warna null
  const create = useCallback(
    (parentId: string | null, name: string, type: 'file' | 'folder'): string | null => {
      const trimmed = name.trim()
      const valid = validateNodeName(trimmed)
      if (valid !== true) return valid
      if (hasSiblingNamed(state.nodes, parentId, trimmed)) return `"${trimmed}" already exists here`
      const node: TreeNode = { id: newTempId(), parentId, name: trimmed, type, content: '' }
      dispatch({ type: 'add', node, open: type === 'file' })
      return null
    },
    [state.nodes],
  )

  const rename = useCallback(
    (id: string, name: string): string | null => {
      const trimmed = name.trim()
      const valid = validateNodeName(trimmed)
      if (valid !== true) return valid
      const node = state.nodes.find((n) => n.id === id)
      if (!node) return 'Not found'
      if (hasSiblingNamed(state.nodes, node.parentId, trimmed, id)) {
        return `"${trimmed}" already exists here`
      }
      dispatch({ type: 'rename', id, name: trimmed })
      return null
    },
    [state.nodes],
  )

  const activeNode = state.nodes.find((n) => n.id === state.activeId) ?? null
  const paths = useMemo(() => buildPathMap(state.nodes), [state.nodes])

  return {
    state,
    dirty,
    changes: { upserts, deletes },
    hasTempNodes: state.nodes.some((n) => isTempId(n.id)),
    previewFiles,
    activeNode,
    paths,
    open,
    close,
    setContent,
    setTitle,
    setTheory,
    markSaved,
    create,
    rename,
    remove,
  }
}
