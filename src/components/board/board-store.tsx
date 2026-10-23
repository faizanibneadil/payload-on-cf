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
import { readScene, SCENE_VERSION, type SceneObject, type Viewport } from '@/lib/scene'
import { validateTitle } from '@/lib/title-slug'

interface Snapshot {
  title: string
  objects: SceneObject[]
}

interface BoardState {
  id: number
  slug: string
  canEdit: boolean
  title: string
  objects: SceneObject[]
  initialViewport: Viewport
  isShared: boolean
  dirty: boolean
  saving: boolean
  sharing: boolean
  titleError: string | null
  setTitle: (title: string) => void
  setObjects: (objects: SceneObject[]) => void
  /** Canvas apna live viewport dene ka tareeqa register karta hai (Save ke waqt liya jata hai) */
  setViewportSource: (source: () => Viewport) => void
  /** Save se pehle canvas ka taaza scene (jaise edit ho raha text) — warna `objects` */
  setFlushSource: (source: () => SceneObject[]) => void
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

// JSON compare — canvas ka data plain JSON hai
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Ek board ka editor state: title + canvas, aur jo server par saved hai uska snapshot.
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
  const [scene] = useState(() => readScene(initialData))
  const [title, setTitleState] = useState(initialTitle)
  const [objects, setObjects] = useState<SceneObject[]>(scene.objects)
  const [saved, setSaved] = useState<Snapshot>({ title: initialTitle, objects: scene.objects })
  // Pan/zoom board ko "unsaved" nahi banata — viewport sirf Save ke waqt saath chala jata hai
  const viewportSource = useRef<() => Viewport>(() => scene.viewport)
  const setViewportSource = useCallback((source: () => Viewport) => {
    viewportSource.current = source
  }, [])
  const flushSource = useRef<(() => SceneObject[]) | null>(null)
  const setFlushSource = useCallback((source: () => SceneObject[]) => {
    flushSource.current = source
  }, [])
  const [isShared, setIsShared] = useState(initialShared)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  const dirty = canEdit && (title !== saved.title || !sameJson(objects, saved.objects))
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
  const latest = useRef({ title, objects, dirty, saving, titleError })
  latest.current = { title, objects, dirty, saving, titleError }

  const save = useCallback(async () => {
    const current = latest.current
    if (!canEdit || current.saving) return
    // Edit ho raha text bhi saath (wo abhi `objects` me na pahuncha ho)
    const objectsNow = flushSource.current?.() ?? current.objects
    const isDirty =
      current.dirty ||
      current.title !== savedRef.current.title ||
      !sameJson(objectsNow, savedRef.current.objects)
    if (!isDirty) return
    if (current.titleError) {
      toast.error(current.titleError)
      return
    }
    setSaving(true)
    const snapshot = { title: current.title.trim(), objects: objectsNow }
    const data = {
      canvas: {
        version: SCENE_VERSION,
        viewport: viewportSource.current(),
        objects: snapshot.objects,
      },
    }
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
      objects,
      initialViewport: scene.viewport,
      isShared,
      dirty,
      saving,
      sharing,
      titleError,
      setTitle: setTitleState,
      setObjects,
      setViewportSource,
      setFlushSource,
      save,
      setShared,
    }),
    [
      id,
      slug,
      canEdit,
      title,
      objects,
      scene.viewport,
      isShared,
      dirty,
      saving,
      sharing,
      titleError,
      setViewportSource,
      setFlushSource,
      save,
      setShared,
    ],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}
