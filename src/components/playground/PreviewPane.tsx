'use client'

import {
  SandpackConsole,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react'
import { Eraser } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

interface PreviewPaneProps {
  files: Record<string, string>
  /** Har Run click par badhta hai */
  runToken: number
}

const DEBOUNCE_MS = 600

function RunWatcher({ runToken }: { runToken: number }): null {
  const { sandpack } = useSandpack()
  const first = useRef(true)
  const runRef = useRef(sandpack.runSandpack)
  runRef.current = sandpack.runSandpack

  // biome-ignore lint/correctness/useExhaustiveDependencies: runToken sirf trigger hai
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // runToken badalne par (pehle files flush ho chuki hoti hain) preview dobara chalao
    const timer = setTimeout(() => runRef.current(), 50)
    return () => clearTimeout(timer)
  }, [runToken])

  return null
}

/**
 * Sandpack sirf bundling + preview ke liye (CodeMirror editor use nahi hota —
 * editing Monaco se hoti hai). Preview ke neeche JS console.
 */
export default function PreviewPane({ files, runToken }: PreviewPaneProps) {
  const { resolvedTheme } = useTheme()
  const [applied, setApplied] = useState(files)
  const latest = useRef(files)
  latest.current = files

  // Typing ke baad thoda ruk kar preview update karo
  // biome-ignore lint/correctness/useExhaustiveDependencies: files sirf debounce trigger hai (latest ref se padhte hain)
  useEffect(() => {
    const timer = setTimeout(() => setApplied(latest.current), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [files])

  // Run par debounce skip: latest files foran apply karo
  const lastToken = useRef(runToken)
  useEffect(() => {
    if (lastToken.current !== runToken) {
      lastToken.current = runToken
      setApplied(latest.current)
    }
  }, [runToken])

  const [consoleKey, setConsoleKey] = useState(0)

  return (
    <SandpackProvider
      template="static"
      files={applied}
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      options={{ recompileMode: 'immediate', autorun: true }}
    >
      <RunWatcher runToken={runToken} />
      <ResizablePanelGroup orientation="vertical" className="h-full w-full">
        <ResizablePanel id="preview" defaultSize="65%" minSize="15%">
          <SandpackPreview
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ height: '100%' }}
          />
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
                onClick={() => setConsoleKey((k) => k + 1)}
              >
                <Eraser />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <SandpackConsole
                key={consoleKey}
                showHeader={false}
                resetOnPreviewRestart
                style={{ height: '100%' }}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SandpackProvider>
  )
}
