'use client'

import { Eraser, Globe, RotateCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
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
}

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

/**
 * Live preview + JS console. Student ka code sandboxed iframe me chalta hai (srcdoc),
 * editing Monaco se hoti hai. Files badalne ke thodi der baad preview khud update hota hai;
 * address bar ke refresh button se foran reload hota hai.
 */
export default function PreviewPane({ files }: PreviewPaneProps) {
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
  }, [entry])

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
      <ResizablePanel id="preview" defaultSize="65%" minSize="15%">
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
            <PanelCollapseButton id="preview" className="shrink-0" />
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
      <ResizablePanel id="console" defaultSize="35%" minSize="10%">
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
