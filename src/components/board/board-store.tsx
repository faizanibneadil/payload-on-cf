'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { setUnsavedChanges } from '@/components/shell/leave-guard'
import { type BoardDocument, readDocument } from '@/lib/document'
import { validateTitle } from '@/lib/title-slug'

interface Snapshot {
  title: string
  doc: BoardDocument
}

interface BoardState {
  id: number
  slug: string
  canEdit: boolean
  title: string
  /** Server se aaya document (editor isi se shuru hota hai) */
  initialDoc: BoardDocument
  isShared: boolean
  dirty: boolean
  saving: boolean
  sharing: boolean
  titleError: string | null
  setTitle: (title: string) => void
  /** Editor ka taaza document (typing rukne ke thori der baad) — "unsaved" isi se banta hai */
  setDoc: (doc: BoardDocument) => void
  /**
   * Editor khulte hi apna normalized document deta hai (Lexical khali root me paragraph jodta hai
   * waghera) — usay hi "saved" maan lo, warna board khulte hi "Unsaved changes" dikhe
   */
  setBaseline: (doc: BoardDocument) => void
  /** Save se pehle editor ka bilkul taaza document (abhi type hua text bhi) — warna `doc` */
  setFlushSource: (source: () => BoardDocument) => void
  save: () => Promise<void>
  setShared: (isShared: boolean) => Promise<void>
}

/**
 * Save/Share ke liye saada fetch (server action nahi): deploy ke dauraan bhi page reload nahi hota,
 * fail ho to sirf message aata hai aur unsaved kaam mehfooz rehta hai.
 */
async function postJson<T extends { ok: boolean; error?: string }>(
  url: string,
  body: unknown,
): Promise<T> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
    const data = (await res.json().catch((): null => null)) as T | null
    if (data && typeof data.ok === 'boolean') return data
    return {
      ok: false,
      error: `The server answered with an error (${res.status}). Please try again.`,
    } as T
  } catch {
    return {
      ok: false,
      error: 'Could not reach the server. Your changes are still here — please try again.',
    } as T
  }
}

const BoardContext = createContext<BoardState | null>(null)

export function useBoard() {
  const value = useContext(BoardContext)
  if (!value) throw new Error('useBoard must be used inside <BoardProvider>')
  return value
}

// JSON compare — document plain JSON hai
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Ek board ka editor state: title + document, aur jo server par saved hai uska snapshot.
 * Koi autosave nahi — sirf "Save" (ya Ctrl/Cmd+S) par ek row write.
 */
export function BoardProvider({
  id,
  slug,
  canEdit,
  initialTitle,
  initialData,
  initialShared,
  children,
}: {
  id: number
  slug: string
  canEdit: boolean
  initialTitle: string
  initialData: unknown
  initialShared: boolean
  children: ReactNode
}) {
  const [initialDoc] = useState(() => readDocument(initialData))
  const [title, setTitleState] = useState(initialTitle)
  const [doc, setDoc] = useState<BoardDocument>(initialDoc)
  const [saved, setSaved] = useState<Snapshot>({ title: initialTitle, doc: initialDoc })
  const flushSource = useRef<(() => BoardDocument) | null>(null)
  const setFlushSource = useCallback((source: () => BoardDocument) => {
    flushSource.current = source
  }, [])
  const setBaseline = useCallback((base: BoardDocument) => {
    setDoc(base)
    setSaved((prev) => ({ ...prev, doc: base }))
  }, [])
  const [isShared, setIsShared] = useState(initialShared)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  const dirty = canEdit && (title !== saved.title || !sameJson(doc, saved.doc))
  const titleCheck = validateTitle(title)
  const titleError = titleCheck === true ? null : titleCheck

  // Unsaved changes: browser band/reload par warning, aur header links ke liye flag
  useEffect(() => {
    setUnsavedChanges(dirty)
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
  useEffect(() => () => setUnsavedChanges(false), [])

  const savedRef = useRef(saved)
  savedRef.current = saved
  const latest = useRef({ title, doc, dirty, saving, titleError })
  latest.current = { title, doc, dirty, saving, titleError }

  const save = useCallback(async () => {
    const current = latest.current
    if (!canEdit || current.saving) return
    // Abhi type hua text bhi saath (wo abhi `doc` me na pahuncha ho)
    const docNow = flushSource.current?.() ?? current.doc
    const isDirty =
      current.dirty ||
      current.title !== savedRef.current.title ||
      !sameJson(docNow, savedRef.current.doc)
    if (!isDirty) return
    if (current.titleError) {
      toast.error(current.titleError)
      return
    }
    setSaving(true)
    const snapshot = { title: current.title.trim(), doc: docNow }
    const data = { doc: snapshot.doc }
    const result = await postJson<{ ok: boolean; error?: string; savesLeft?: number | null }>(
      `/api/boards/${id}/save`,
      { title: snapshot.title, data },
    )
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error ?? 'Could not save the board.')
      return
    }
    setTitleState(snapshot.title)
    setDoc(snapshot.doc)
    setSaved(snapshot)
    document.title = `${snapshot.title} · Boards`
    toast.success(
      'Saved',
      result.savesLeft == null
        ? undefined
        : {
            description: `${result.savesLeft} save${result.savesLeft === 1 ? '' : 's'} left for this board in the current 24 hours.`,
          },
    )
  }, [canEdit, id])

  // Ctrl/Cmd+S = Save (browser ka "save page" nahi)
  useEffect(() => {
    if (!canEdit) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canEdit, save])

  const setShared = useCallback(
    async (next: boolean) => {
      if (!canEdit) return
      setSharing(true)
      setIsShared(next)
      const result = await postJson<{ ok: boolean; error?: string; isShared?: boolean }>(
        `/api/boards/${id}/share`,
        { isShared: next },
      )
      setSharing(false)
      if (!result.ok) {
        setIsShared(!next)
        toast.error(result.error ?? 'Could not change sharing.')
        return
      }
      setIsShared(Boolean(result.isShared))
    },
    [canEdit, id],
  )

  const value = useMemo<BoardState>(
    () => ({
      id,
      slug,
      canEdit,
      title,
      initialDoc,
      isShared,
      dirty,
      saving,
      sharing,
      titleError,
      setTitle: setTitleState,
      setDoc,
      setBaseline,
      setFlushSource,
      save,
      setShared,
    }),
    [
      id,
      slug,
      canEdit,
      title,
      initialDoc,
      isShared,
      dirty,
      saving,
      sharing,
      titleError,
      setBaseline,
      setFlushSource,
      save,
      setShared,
    ],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}
