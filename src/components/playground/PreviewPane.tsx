'use client'

import { ChevronDown, Eraser, Globe, Plus, RotateCw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  buildPreviewDocument,
  defaultEntry,
  isHtmlPath,
  lookupFile,
  resolvePath,
} from '@/lib/preview-document'
import { cn } from '@/lib/utils'
import { PanelCollapseButton } from './PanelWorkspace'

interface PreviewPaneProps {
  files: Record<string, string>
  /** Mobile: tab strip ki jagah dropdown dikhao */
  compact?: boolean
}

interface PreviewTabState {
  id: number
  /** Address bar wali file ka naam (e.g. index.html) */
  label: string
}

/** Zyada se zyada itne preview tabs khul sakte hain */
export const MAX_PREVIEW_TABS = 10

type Level = 'log' | 'info' | 'warn' | 'error' | 'debug'
interface LogEntry {
  id: number
  level: Level
  text: string
}

const DEBOUNCE_MS = 600
const MAX_LOGS = 500

const LEVEL_CLASS: Record<Level, string> = {
  log: 'text-foreground',
  info: 'text-sky-500',
  debug: 'text-muted-foreground',
  warn: 'text-amber-500',
  error: 'text-destructive',
}

const toPath = (value: string) => {
  const trimmed = value.trim().replace(/^(?:https?:\/\/)?localhost(?::\d+)?/i, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

interface PreviewTabProps {
  tabId: number
  files: Record<string, string>
  onEntryChange: (tabId: number, entry: string | undefined) => void
}

/**
 * Ek preview tab: apna address bar, refresh aur console. Student ka code sandboxed iframe me
 * chalta hai (srcdoc). Files badalne ke thodi der baad preview khud update hota hai;
 * address bar ke refresh button se foran reload hota hai.
 */
function PreviewTab({ tabId, files, onEntryChange }: PreviewTabProps) {
  const [applied, setApplied] = useState(files)
  const latest = useRef(files)
  latest.current = files

  // Typing ke baad thoda ruk kar preview update karo
  // biome-ignore lint/correctness/useExhaustiveDependencies: files sirf debounce trigger hai (latest ref se padhte hain)
  useEffect(() => {
    const timer = setTimeout(() => setApplied(latest.current), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [files])

  const [requested, setRequested] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [draft, setDraft] = useState('')
  const [addressError, setAddressError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const logId = useRef(0)
  const logEnd = useRef<HTMLDivElement>(null)

  // Jo page maanga gaya woh ab bhi maujood ho to wahi, warna default (index.html)
  const entry =
    requested && lookupFile(applied, requested) !== undefined ? requested : defaultEntry(applied)
  const srcDoc = useMemo(() => buildPreviewDocument(applied, entry), [applied, entry])

  useEffect(() => {
    setDraft(entry ?? '')
    setAddressError(false)
    onEntryChange(tabId, entry)
  }, [entry, tabId, onEntryChange])

  // Har naye load par console saaf (srcDoc ya reloadKey badalne par iframe dobara load hota hai)
  // biome-ignore lint/correctness/useExhaustiveDependencies: dono sirf reset trigger hain
  useEffect(() => {
    setLogs([])
  }, [srcDoc, reloadKey])

  const entryRef = useRef(entry)
  entryRef.current = entry
  const appliedRef = useRef(applied)
  appliedRef.current = applied

  // Iframe se console / error / link-click messages (sirf apne iframe se)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data as { __pg?: number; type?: string; payload?: any } | null
      if (data?.__pg !== 1) return

      if (data.type === 'console' && typeof data.payload?.text === 'string') {
        const level = (data.payload.level as Level) in LEVEL_CLASS ? data.payload.level : 'log'
        setLogs((prev) =>
          [...prev, { id: ++logId.current, level, text: data.payload.text as string }].slice(
            -MAX_LOGS,
          ),
        )
      } else if (data.type === 'clear') {
        setLogs([])
      } else if (data.type === 'navigate' && typeof data.payload?.href === 'string') {
        const base = entryRef.current ?? '/index.html'
        const target = resolvePath(base, data.payload.href)
        if (isHtmlPath(target) && lookupFile(appliedRef.current, target) !== undefined) {
          setRequested(target)
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Naya log aane par console neeche scroll
  // biome-ignore lint/correctness/useExhaustiveDependencies: logs.length sirf scroll trigger hai
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'end' })
  }, [logs.length])

  const refresh = () => {
    setApplied(latest.current)
    setReloadKey((k) => k + 1)
  }

  const go = () => {
    const path = toPath(draft)
    if (isHtmlPath(path) && lookupFile(applied, path) !== undefined) {
      setAddressError(false)
      setRequested(path)
      setReloadKey((k) => k + 1)
    } else {
      setAddressError(true)
    }
  }

  return (
    <ResizablePanelGroup orientation="vertical" className="h-full w-full">
      <ResizablePanel id={`tab-${tabId}-view`} defaultSize="65%" minSize="15%">
        <div className="flex h-full min-h-0 flex-col bg-editor">
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-b px-2">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Refresh preview"
              aria-label="Refresh preview"
              onClick={refresh}
            >
              <RotateCw />
            </Button>
            <div
              className={cn(
                'flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md border bg-background px-2 text-xs',
                addressError && 'border-destructive',
              )}
            >
              <Globe className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-muted-foreground">localhost</span>
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setAddressError(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') go()
                  if (e.key === 'Escape') {
                    setDraft(entry ?? '')
                    setAddressError(false)
                  }
                }}
                spellCheck={false}
                aria-label="Preview address"
                aria-invalid={addressError}
                title={addressError ? 'No such HTML file in this project' : 'Preview address'}
                className="min-w-0 flex-1 bg-transparent font-mono outline-none"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-white">
            <iframe
              key={reloadKey}
              ref={iframeRef}
              title="Preview"
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"
              className="h-full w-full border-0 bg-white"
            />
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id={`tab-${tabId}-console`} defaultSize="35%" minSize="10%">
        <div className="flex h-full min-h-0 flex-col bg-editor">
          <div className="flex h-8 shrink-0 items-center justify-between border-b px-3">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Console
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              title="Clear console"
              aria-label="Clear console"
              onClick={() => setLogs([])}
            >
              <Eraser />
            </Button>
          </div>
          <div
            role="log"
            aria-label="Console output"
            className="min-h-0 flex-1 overflow-y-auto py-1 font-mono text-xs"
          >
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'border-b border-border/40 px-3 py-1 break-words whitespace-pre-wrap',
                  LEVEL_CLASS[log.level],
                )}
              >
                {log.text}
              </div>
            ))}
            <div ref={logEnd} />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

const baseName = (path: string | undefined) => path?.split('/').pop() || 'Preview'

/** Preview tabs ka manager: tab strip (desktop) ya dropdown (mobile) + har tab ka apna PreviewTab */
export default function PreviewPane({ files, compact = false }: PreviewPaneProps) {
  const nextId = useRef(2)
  const [tabs, setTabs] = useState<PreviewTabState[]>([{ id: 1, label: 'Preview' }])
  const [activeId, setActiveId] = useState(1)
  const full = tabs.length >= MAX_PREVIEW_TABS

  const addTab = () => {
    if (full) return
    const id = nextId.current++
    setTabs((prev) => [...prev, { id, label: 'Preview' }])
    setActiveId(id)
  }

  const closeTab = (id: number) => {
    if (tabs.length <= 1) return
    const index = tabs.findIndex((t) => t.id === id)
    const remaining = tabs.filter((t) => t.id !== id)
    setTabs(remaining)
    if (id === activeId) setActiveId(remaining[Math.min(index, remaining.length - 1)].id)
  }

  const onEntryChange = useCallback((tabId: number, entry: string | undefined) => {
    const label = baseName(entry)
    setTabs((prev) =>
      prev.some((t) => t.id === tabId && t.label !== label)
        ? prev.map((t) => (t.id === tabId ? { ...t, label } : t))
        : prev,
    )
  }, [])

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]
  const newTabButton = (
    <span
      className="shrink-0"
      title={full ? `Maximum ${MAX_PREVIEW_TABS} preview tabs` : 'New preview tab'}
    >
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={full}
        onClick={addTab}
        aria-label="New preview tab"
      >
        <Plus />
      </Button>
    </span>
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-editor">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b px-1">
        {compact ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" aria-label="Preview tabs" className="min-w-0" />
              }
            >
              <span className="truncate">{active.label}</span>
              <span className="text-muted-foreground text-xs">
                {tabs.findIndex((t) => t.id === active.id) + 1}/{tabs.length}
              </span>
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-44">
              {tabs.map((t, i) => (
                <DropdownMenuItem key={t.id} onClick={() => setActiveId(t.id)}>
                  <span className="truncate">
                    {i + 1}. {t.label}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={full} onClick={addTab}>
                <Plus /> {full ? `Maximum ${MAX_PREVIEW_TABS} tabs` : 'New tab'}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={tabs.length <= 1} onClick={() => closeTab(active.id)}>
                <X /> Close this tab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            role="tablist"
            aria-label="Preview tabs"
            className="flex min-w-0 flex-1 overflow-x-auto"
          >
            {tabs.map((t) => {
              const selected = t.id === active.id
              return (
                <div
                  key={t.id}
                  className={cn(
                    'group flex h-7 shrink-0 items-center rounded-md text-xs',
                    selected
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveId(t.id)}
                    className="max-w-32 truncate px-2.5 outline-none focus-visible:underline"
                  >
                    {t.label}
                  </button>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Close ${t.label} tab`}
                      title="Close tab"
                      onClick={() => closeTab(t.id)}
                      className="mr-1 rounded p-0.5 opacity-60 hover:bg-background hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {newTabButton}
        {compact && <span className="flex-1" />}
        <PanelCollapseButton id="preview" className="shrink-0" />
      </div>
      <div className="min-h-0 flex-1">
        {tabs.map((t) => (
          // Band tabs display:none se chhupte hain (iframe / console ki state bachi rehti hai)
          <div key={t.id} className={cn('h-full', t.id !== active.id && 'hidden')}>
            <PreviewTab tabId={t.id} files={files} onEntryChange={onEntryChange} />
          </div>
        ))}
      </div>
    </div>
  )
}
