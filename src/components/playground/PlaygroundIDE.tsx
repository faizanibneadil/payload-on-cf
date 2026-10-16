'use client'

import { BookOpen, Code2, Eye, FileText, FolderTree, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { createPlaygroundAction } from '@/app/(frontend)/actions'
import { logoutUserAction } from '@/app/(frontend)/login/actions'
import {
  forkPlaygroundAction,
  renamePlaygroundAction,
  savePlaygroundAction,
} from '@/app/(frontend)/p/actions'
import type { TreeNode } from '@/lib/playground-tree'
import { cn } from '@/lib/utils'
import FileExplorer from './FileExplorer'
import PanelWorkspace, { PanelCollapseButton } from './PanelWorkspace'
import PlaygroundsDialog, { type PlaygroundListItem } from './PlaygroundsDialog'
import TitleBar, { type SessionUser } from './TitleBar'
import { usePlaygroundState } from './use-playground-state'

// Heavy client-only modules — sirf browser me, alag chunk me load hote hain
const CodeEditor = dynamic(() => import('./CodeEditor'), { ssr: false, loading: () => <Loading /> })
const PreviewPane = dynamic(() => import('./PreviewPane'), {
  ssr: false,
  loading: () => <Loading />,
})
const TheoryEditor = dynamic(() => import('./TheoryEditor'), {
  ssr: false,
  loading: () => <Loading />,
})

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Loading…
    </div>
  )
}

export interface SavedPlayground {
  id: number | string
  title: string
  slug: string
  ownerId: number | string
  ownerName: string | null
}

interface PlaygroundIDEProps {
  user: SessionUser | null
  /** null = abhi save nahi hua (draft / scratch) */
  playground: SavedPlayground | null
  initial: { nodes: TreeNode[]; title: string; theory: unknown }
  /** Purane URL-state record ka id — pehli save par service se delete hota hai */
  legacyRecordId?: string
  /** Draft purane link se import hua hai (is par "My playgrounds" popup nahi khulta) */
  fromLegacy?: boolean
  playgrounds: PlaygroundListItem[]
}

type MobileTab = 'theory' | 'files' | 'code' | 'preview'

const DESKTOP_QUERY = '(min-width: 768px)'

// Server par null: pehle layout pata chalne tak skeleton, taake galat layout mount na ho
function useDesktop(): boolean | null {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(DESKTOP_QUERY)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    (): boolean | null => null,
  )
}

const hasTheoryContent = (theory: unknown): boolean => {
  const content = (theory as { content?: { type?: string; content?: unknown[] }[] } | null)?.content
  return Boolean(content?.some((n) => n.type !== 'paragraph' || (n.content?.length ?? 0) > 0))
}

export default function PlaygroundIDE({
  user,
  playground,
  initial,
  legacyRecordId,
  fromLegacy = false,
  playgrounds,
}: PlaygroundIDEProps) {
  const router = useRouter()
  const desktop = useDesktop()
  const isDraft = playground === null

  const isOwner = isDraft
    ? true
    : Boolean(user && (user.role === 'admin' || String(user.id) === String(playground.ownerId)))
  const readOnly = !isOwner

  const ide = usePlaygroundState(initial)
  const { state, dirty, changes, activeNode, paths } = ide

  const [busy, setBusy] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('code')
  const [visited, setVisited] = useState<Set<MobileTab>>(() => new Set(['code']))

  // Signed-in student `/` par aaye to pehli baar uske playgrounds dikhao (session me ek hi baar)
  useEffect(() => {
    if (!user || !isDraft || fromLegacy) return
    try {
      if (sessionStorage.getItem('pg-list-shown')) return
      sessionStorage.setItem('pg-list-shown', '1')
    } catch {
      // storage block ho to bhi list dikha do
    }
    setListOpen(true)
  }, [user, isDraft, fromLegacy])

  // Mobile par agar visitor ke liye theory likhi hui hai to pehle wahi dikhao
  const mobileInit = useRef(false)
  useEffect(() => {
    if (desktop === null || mobileInit.current) return
    mobileInit.current = true
    if (!desktop && hasTheoryContent(initial.theory) && !isOwner) setMobileTab('theory')
  }, [desktop, initial.theory, isOwner])

  const goTab = useCallback((tab: MobileTab) => {
    setMobileTab(tab)
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }, [])

  // Unsaved changes ke saath tab band/refresh par browser warning
  useEffect(() => {
    if (!dirty || readOnly) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, readOnly])

  // In-app navigation (Link / router) par unsaved changes ke liye confirm; beforeunload sirf tab band/refresh cover karta hai
  const confirmLeave = useCallback(
    () => !dirty || readOnly || window.confirm('You have unsaved changes. Leave without saving?'),
    [dirty, readOnly],
  )

  const save = useCallback(async () => {
    if (busy || readOnly) return
    if (!user) {
      toast.info('Please sign in to save your work')
      router.push('/login')
      return
    }
    setBusy(true)
    try {
      if (isDraft) {
        const res = await createPlaygroundAction({
          title: state.title,
          nodes: state.nodes,
          theory: state.theory,
          legacyRecordId,
        })
        if (!res.success) {
          toast.error(res.error)
          return
        }
        toast.success('Playground saved')
        router.push(`/p/${res.slug}`)
        return
      }

      const res = await savePlaygroundAction({
        playgroundId: playground.id,
        theory: state.theoryDirty ? state.theory : undefined,
        upserts: changes.upserts,
        deletes: changes.deletes,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }

      let slug = playground.slug
      let savedTitle: string | undefined
      if (state.title !== state.baseTitle) {
        const renamed = await renamePlaygroundAction(playground.id, state.title)
        if (renamed.success) {
          slug = renamed.slug
          savedTitle = state.title
        } else {
          toast.error(renamed.error)
        }
      }
      ide.markSaved(res.nodes, savedTitle)
      toast.success('Saved')
      if (slug !== playground.slug) router.replace(`/p/${slug}`)
    } finally {
      setBusy(false)
    }
  }, [busy, readOnly, user, router, isDraft, state, legacyRecordId, playground, changes, ide])

  const fork = useCallback(async () => {
    if (!playground || busy) return
    if (!user) {
      toast.info('Please sign in to fork this playground')
      router.push('/login')
      return
    }
    setBusy(true)
    try {
      const res = await forkPlaygroundAction(playground.id)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Forked — this copy is yours now')
      router.push(`/p/${res.slug}`)
    } finally {
      setBusy(false)
    }
  }, [playground, busy, user, router])

  const share = useCallback(async () => {
    if (!playground) return
    const url = `${window.location.origin}/p/${playground.slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: playground.title, url })
        return
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy the link')
    }
  }, [playground])

  const signOut = useCallback(async () => {
    if (!confirmLeave()) return
    await logoutUserAction()
    try {
      sessionStorage.removeItem('pg-list-shown')
    } catch {
      // ignore
    }
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }, [router, confirmLeave])

  const openFile = useCallback(
    (id: string) => {
      ide.open(id)
      if (desktop === false) goTab('code')
    },
    [ide, desktop, goTab],
  )

  const modifiedIds = useMemo(() => new Set(changes.upserts.map((n) => n.id)), [changes.upserts])

  const titleEditable = !readOnly

  const explorer = (
    <FileExplorer
      nodes={state.nodes}
      activeId={state.activeId}
      readOnly={readOnly}
      onOpen={openFile}
      onCreate={ide.create}
      onRename={ide.rename}
      onDelete={ide.remove}
    />
  )

  const editor = (
    <div className="flex h-full min-h-0 flex-col bg-editor">
      {(desktop || state.openIds.length > 0) && (
        <div className="flex h-9 shrink-0 items-center border-b bg-muted/30">
          <div
            className="flex h-full min-w-0 flex-1 overflow-x-auto"
            role="tablist"
            aria-label="Open files"
          >
            {state.openIds.length === 0 && (
              <span className="flex items-center px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Code
              </span>
            )}
            {state.openIds.map((id) => {
              const node = state.nodes.find((n) => n.id === id)
              if (!node) return null
              const active = id === state.activeId
              return (
                <div
                  key={id}
                  className={cn(
                    'group flex shrink-0 items-center gap-1.5 border-r pr-1 pl-3 text-xs',
                    active
                      ? 'bg-editor text-foreground'
                      : 'text-muted-foreground hover:bg-accent/40',
                  )}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => ide.open(id)}
                    className="flex h-full items-center gap-1.5"
                  >
                    <FileText className="size-3.5" />
                    {node.name}
                    {modifiedIds.has(id) && !readOnly && (
                      <span
                        role="img"
                        className="size-1.5 rounded-full bg-amber-500"
                        aria-label="Modified"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Close ${node.name}`}
                    onClick={() => ide.close(id)}
                    className="flex size-5 items-center justify-center rounded-sm opacity-60 hover:bg-muted hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
          <PanelCollapseButton id="code" className="mx-1 shrink-0" />
        </div>
      )}
      <div className="min-h-0 flex-1">
        {activeNode && activeNode.type === 'file' ? (
          <CodeEditor
            path={paths.get(activeNode.id) ?? activeNode.name}
            value={activeNode.content}
            readOnly={readOnly}
            onChange={(value) => ide.setContent(activeNode.id, value)}
            onSave={save}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Code2 className="size-8 opacity-40" />
            <p>Select a file from the explorer to start editing.</p>
          </div>
        )}
      </div>
    </div>
  )

  const preview = <PreviewPane files={ide.previewFiles} />

  const theory = (
    <TheoryEditor content={state.theory} editable={!readOnly} onChange={ide.setTheory} />
  )

  const titleBar = (
    <TitleBar
      user={user}
      title={state.title}
      onTitleChange={ide.setTitle}
      titleEditable={titleEditable}
      readOnly={readOnly}
      isDraft={isDraft}
      dirty={dirty}
      busy={busy}
      ownerName={playground?.ownerName ?? null}
      theoryOpen={false}
      showTheoryToggle={false}
      onToggleTheory={() => {}}
      onSave={save}
      onFork={fork}
      onShare={share}
      onOpenPlaygrounds={() => setListOpen(true)}
      onSignOut={signOut}
      confirmLeave={confirmLeave}
    />
  )

  const dialog = (
    <PlaygroundsDialog
      open={listOpen}
      onOpenChange={setListOpen}
      signedIn={Boolean(user)}
      items={playgrounds}
      currentSlug={playground?.slug}
      confirmLeave={confirmLeave}
    />
  )

  // Layout pata hone se pehle skeleton
  if (desktop === null) {
    return (
      <div className="flex h-dvh flex-col">
        <div className="h-11 shrink-0 border-b bg-card" />
        <Loading />
      </div>
    )
  }

  if (desktop) {
    return (
      <div className="flex h-dvh flex-col">
        {titleBar}
        <main className="min-h-0 flex-1">
          <PanelWorkspace
            theoryWanted={hasTheoryContent(initial.theory) || !readOnly}
            panels={{ theory, files: explorer, code: editor, preview }}
          />
        </main>
        {dialog}
      </div>
    )
  }

  // Mobile: ek waqt me ek panel, neeche tab bar. Visit ke baad panel mounted rehta hai
  // (Monaco/preview dobara boot na ho), bas hide hota hai.
  const tabs: { id: MobileTab; label: string; icon: typeof Code2 }[] = [
    { id: 'theory', label: 'Theory', icon: BookOpen },
    { id: 'files', label: 'Files', icon: FolderTree },
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Eye },
  ]
  const panes: Record<MobileTab, React.ReactNode> = {
    theory,
    files: explorer,
    code: editor,
    preview,
  }

  return (
    <div className="flex h-dvh flex-col">
      {titleBar}
      <main className="relative min-h-0 flex-1">
        {tabs.map(({ id }) => (
          <div
            key={id}
            className={cn('absolute inset-0', mobileTab !== id && 'invisible')}
            aria-hidden={mobileTab !== id}
          >
            {visited.has(id) ? panes[id] : null}
          </div>
        ))}
      </main>
      <nav className="grid shrink-0 grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => goTab(id)}
            aria-current={mobileTab === id ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-[11px]',
              mobileTab === id ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
      {dialog}
    </div>
  )
}
