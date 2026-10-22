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
import { saveBoardAction, setBoardSharedAction } from '@/app/(frontend)/actions/boards'
import { setUnsavedChanges } from '@/components/shell/leave-guard'
import { validateTitle } from '@/lib/title-slug'

export interface BoardSnapshot {
  title: string
  data: unknown
}

interface BoardState {
  id: number
  slug: string
  canEdit: boolean
  title: string
  data: unknown
  isShared: boolean
  dirty: boolean
  saving: boolean
  sharing: boolean
  titleError: string | null
  setTitle: (title: string) => void
  setData: (data: unknown) => void
  save: () => Promise<void>
  setShared: (isShared: boolean) => Promise<void>
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
  const [title, setTitleState] = useState(initialTitle)
  const [data, setData] = useState<unknown>(initialData)
  const [saved, setSaved] = useState<BoardSnapshot>({ title: initialTitle, data: initialData })
  const [isShared, setIsShared] = useState(initialShared)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  const dirty = canEdit && (title !== saved.title || !sameJson(data, saved.data))
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

  const latest = useRef({ title, data, dirty, saving, titleError })
  latest.current = { title, data, dirty, saving, titleError }

  const save = useCallback(async () => {
    const current = latest.current
    if (!canEdit || current.saving || !current.dirty) return
    if (current.titleError) {
      toast.error(current.titleError)
      return
    }
    setSaving(true)
    const snapshot = { title: current.title.trim(), data: current.data }
    const result = await saveBoardAction({ id, ...snapshot })
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
      const result = await setBoardSharedAction({ id, isShared: next })
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
      data,
      isShared,
      dirty,
      saving,
      sharing,
      titleError,
      setTitle: setTitleState,
      setData,
      save,
      setShared,
    }),
    [id, slug, canEdit, title, data, isShared, dirty, saving, sharing, titleError, save, setShared],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}
