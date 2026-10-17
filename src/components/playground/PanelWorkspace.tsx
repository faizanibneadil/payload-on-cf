'use client'

import {
  BookOpen,
  Code2,
  Eye,
  FolderTree,
  type LucideIcon,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Layout, PanelImperativeHandle } from 'react-resizable-panels'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'

// Accordion-style workspace: har panel ya to khula (horizontal) hota hai ya band (40px vertical rail).
// Rail par click se panel khulta hai, min size se chhota drag karne par panel khud rail ban jata hai.

export type PanelId = 'theory' | 'files' | 'code' | 'preview'

export const RAIL_PX = 40
/** Is width (px) ya us se bari screen par theory pehle se khuli hoti hai */
export const WIDE_SCREEN_PX = 1280

interface PanelSpec {
  label: string
  icon: LucideIcon
  min: number
  /** undefined = koi max nahi (bari screens par container lock nahi hota) */
  max?: number
  /** Khulne par starting width */
  size: number
  /** Rail screen ke kis taraf hai (collapse icon ki direction) */
  side: 'left' | 'right'
}

const SPECS: Record<PanelId, PanelSpec> = {
  theory: { label: 'Theory', icon: BookOpen, min: 280, max: 720, size: 360, side: 'left' },
  files: { label: 'Files', icon: FolderTree, min: 180, max: 420, size: 240, side: 'left' },
  code: { label: 'Code', icon: Code2, min: 360, size: 0, side: 'left' },
  preview: { label: 'Preview', icon: Eye, min: 320, size: 0, side: 'right' },
}

const ORDER: PanelId[] = ['theory', 'files', 'code', 'preview']
// 3 separators ka 1px + thoda safety margin
const SLACK_PX = 6

type OpenMap = Record<PanelId, boolean>
type StampMap = Record<PanelId, number>

const requiredWidth = (open: OpenMap) =>
  ORDER.reduce((sum, id) => sum + (open[id] ? SPECS[id].min : RAIL_PX), SLACK_PX)

/**
 * Jagah kam ho to panels band karta hai. Code kabhi band nahi hota; sab se purani khuli
 * panel pehle band hoti hai, Preview aakhri option hai. `keep` wale panels ko haath nahi lagata.
 * `open` ko wahin badal deta hai aur band kiye gaye ids return karta hai.
 */
function evictForWidth(open: OpenMap, stamps: StampMap, width: number, keep: PanelId[]): PanelId[] {
  const evicted: PanelId[] = []
  while (requiredWidth(open) > width) {
    const candidates = ORDER.filter((id) => open[id] && id !== 'code' && !keep.includes(id)).sort(
      (a, b) => {
        if (a === 'preview') return 1
        if (b === 'preview') return -1
        return stamps[a] - stamps[b]
      },
    )
    const next = candidates[0]
    if (!next) break
    open[next] = false
    evicted.push(next)
  }
  return evicted
}

/** Pehli baar kaun se panels khule hon: width ke hisaab se */
function initialOpen(width: number, theoryWanted: boolean): { open: OpenMap; stamps: StampMap } {
  const open: OpenMap = {
    theory: theoryWanted && width >= WIDE_SCREEN_PX,
    files: true,
    code: true,
    preview: true,
  }
  const stamps: StampMap = { theory: 1, files: 2, code: 3, preview: 4 }
  evictForWidth(open, stamps, width, [])
  return { open, stamps }
}

/** Starting layout (percent) — rails 40px, baqi jagah Code aur Preview me taqseem */
function initialLayout(open: OpenMap, width: number): Layout {
  const avail = Math.max(width - 4, 1)
  const px: Record<PanelId, number> = {
    theory: open.theory ? SPECS.theory.size : RAIL_PX,
    files: open.files ? SPECS.files.size : RAIL_PX,
    code: RAIL_PX,
    preview: RAIL_PX,
  }
  const rest = avail - px.theory - px.files
  if (open.code && open.preview) {
    const code = Math.min(
      Math.max(Math.round(rest * 0.58), SPECS.code.min),
      Math.max(rest - SPECS.preview.min, SPECS.code.min),
    )
    px.code = code
    px.preview = rest - code
  } else if (open.code) {
    px.code = rest - RAIL_PX
  } else {
    px.preview = rest - RAIL_PX
  }
  const layout: Layout = {}
  let used = 0
  ORDER.forEach((id, index) => {
    if (index === ORDER.length - 1) layout[id] = Math.max(100 - used, 0)
    else {
      layout[id] = (px[id] / avail) * 100
      used += layout[id]
    }
  })
  return layout
}

interface PanelControls {
  isOpen: (id: PanelId) => boolean
  open: (id: PanelId) => void
  collapse: (id: PanelId) => void
  canCollapse: (id: PanelId) => boolean
}

const PanelControlsContext = createContext<PanelControls | null>(null)

/** Workspace ke bahar (mobile) null milta hai, is liye header/buttons wahan khud hide ho jate hain */
export const usePanelControls = () => useContext(PanelControlsContext)

/** Panel header ka "rail me band karo" button */
export function PanelCollapseButton({ id, className }: { id: PanelId; className?: string }) {
  const controls = usePanelControls()
  if (!controls) return null
  const spec = SPECS[id]
  const allowed = controls.canCollapse(id)
  const Icon = spec.side === 'right' ? PanelRightClose : PanelLeftClose
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={className}
      disabled={!allowed}
      onClick={() => controls.collapse(id)}
      title={allowed ? `Collapse ${spec.label}` : 'Keep either Code or Preview open'}
      aria-label={`Collapse ${spec.label} panel`}
    >
      <Icon />
    </Button>
  )
}

/** Simple header (title + collapse) — un panels ke liye jin ka apna header nahi hai */
export function PanelHeader({ id }: { id: PanelId }) {
  const controls = usePanelControls()
  if (!controls) return null
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {SPECS[id].label}
      </span>
      <PanelCollapseButton id={id} />
    </div>
  )
}

function Rail({ id, onOpen }: { id: PanelId; onOpen: () => void }) {
  const { label, icon: Icon } = SPECS[id]
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Open ${label}`}
      aria-label={`Open ${label} panel`}
      className="flex h-full w-full flex-col items-center gap-3 bg-card py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden"
    >
      <Icon className="size-4 shrink-0" />
      <span className="writing-vertical text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </span>
    </button>
  )
}

interface PanelWorkspaceProps {
  panels: Record<PanelId, ReactNode>
  /** Theory me likha hua hai ya user owner hai — tab bari screen par theory khuli rahe */
  theoryWanted: boolean
}

export default function PanelWorkspace({ panels, theoryWanted }: PanelWorkspaceProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  // Har panel ka imperative handle (callback ref se bharta hai) — object khud stable rehta hai
  const handlesRef = useRef<Record<PanelId, PanelImperativeHandle | null>>({
    theory: null,
    files: null,
    code: null,
    preview: null,
  })

  // Width sirf pehle render par chahiye (SSR nahi — IDE desktop pata chalne ke baad hi mount hota hai)
  const [init] = useState(() => {
    const width = typeof window === 'undefined' ? WIDE_SCREEN_PX : window.innerWidth
    const { open, stamps } = initialOpen(width, theoryWanted)
    return { open, stamps, layout: initialLayout(open, width) }
  })

  const [open, setOpen] = useState<OpenMap>(init.open)
  const openRef = useRef<OpenMap>({ ...init.open })
  const stamps = useRef<StampMap>({ ...init.stamps })
  const clock = useRef(10)
  // Content pehli baar khulne par hi mount hota hai (Tiptap/Monaco ka bojh band panel par nahi)
  const [mounted, setMounted] = useState<OpenMap>(init.open)

  const sync = useCallback((id: PanelId) => {
    const handle = handlesRef.current[id]
    if (!handle) return
    const isOpen = !handle.isCollapsed()
    if (openRef.current[id] === isOpen) return
    openRef.current = { ...openRef.current, [id]: isOpen }
    if (isOpen) stamps.current[id] = ++clock.current
    setOpen(openRef.current)
    if (isOpen) setMounted((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
  }, [])

  // Initial layout ke baad jo panel expected-state se mel nahi khata use theek karo
  useLayoutEffect(() => {
    for (const id of ORDER) {
      const handle = handlesRef.current[id]
      if (!handle) continue
      if (init.open[id] && handle.isCollapsed()) handle.expand()
      if (!init.open[id] && !handle.isCollapsed()) handle.collapse()
    }
  }, [init.open])

  const canCollapse = useCallback(
    (id: PanelId) => {
      if (!open[id]) return false
      if (id === 'code') return open.preview
      if (id === 'preview') return open.code
      return true
    },
    [open],
  )

  const openPanel = useCallback((id: PanelId) => {
    const width = wrapRef.current?.clientWidth ?? window.innerWidth
    const next = { ...openRef.current, [id]: true }
    const evicted = evictForWidth(next, stamps.current, width, [id])
    for (const other of evicted) handlesRef.current[other]?.collapse()
    handlesRef.current[id]?.expand()
  }, [])

  const collapsePanel = useCallback((id: PanelId) => {
    const current = openRef.current
    if (id === 'code' && !current.preview) return
    if (id === 'preview' && !current.code) return
    handlesRef.current[id]?.collapse()
  }, [])

  // Window chhoti hone par agar panels fit na hon to purane panels rail me chale jayen
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = { ...openRef.current }
        for (const id of evictForWidth(next, stamps.current, wrap.clientWidth, [])) {
          handlesRef.current[id]?.collapse()
        }
      })
    })
    observer.observe(wrap)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const controls = useMemo<PanelControls>(
    () => ({
      isOpen: (id) => open[id],
      open: openPanel,
      collapse: collapsePanel,
      canCollapse,
    }),
    [open, openPanel, collapsePanel, canCollapse],
  )

  const panel = (id: PanelId) => {
    const spec = SPECS[id]
    const collapsible = id === 'code' ? open.preview : id === 'preview' ? open.code : true
    return (
      <ResizablePanel
        id={id}
        panelRef={(handle) => {
          handlesRef.current[id] = handle
        }}
        collapsible={collapsible}
        collapsedSize={RAIL_PX}
        minSize={spec.min}
        maxSize={spec.max}
        groupResizeBehavior={id === 'theory' || id === 'files' ? 'preserve-pixel-size' : undefined}
        onResize={() => sync(id)}
      >
        <div className="relative h-full min-h-0 w-full overflow-hidden">
          {!open[id] && <Rail id={id} onOpen={() => openPanel(id)} />}
          <div className={cn('h-full min-h-0 flex-col', open[id] ? 'flex' : 'hidden')}>
            {mounted[id] ? panels[id] : null}
          </div>
        </div>
      </ResizablePanel>
    )
  }

  return (
    <PanelControlsContext.Provider value={controls}>
      <div ref={wrapRef} className="h-full min-h-0 w-full">
        <ResizablePanelGroup orientation="horizontal" defaultLayout={init.layout}>
          {panel('theory')}
          <ResizableHandle />
          {panel('files')}
          <ResizableHandle />
          {panel('code')}
          <ResizableHandle />
          {panel('preview')}
        </ResizablePanelGroup>
      </div>
    </PanelControlsContext.Provider>
  )
}
