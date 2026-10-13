'use client'

import dynamic from 'next/dynamic'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import type { PlaygroundFile } from './PracticePanel'

const TheoryEditor = dynamic(() => import('./TheoryEditor'), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-muted-foreground">Loading Theory Editor...</div>,
})

const PracticePanel = dynamic(() => import('./PracticePanel'), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-muted-foreground">Loading Code Editor...</div>,
})

interface CorePlaygroundProps {
  initialTheory?: any
  initialFiles?: PlaygroundFile[]
  isReadOnly?: boolean
  onTheoryChange?: (content: any) => void
  onFilesChange?: (files: PlaygroundFile[]) => void
}

export default function CorePlayground({
  initialTheory,
  initialFiles,
  isReadOnly = false,
  onTheoryChange,
  onFilesChange,
}: CorePlaygroundProps) {
  return (
    <div className="h-full w-full bg-background overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={40} minSize={20} maxSize={80}>
          <TheoryEditor content={initialTheory} isReadOnly={isReadOnly} onChange={onTheoryChange} />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={60} minSize={20}>
          <PracticePanel
            files={initialFiles}
            isReadOnly={isReadOnly}
            onFilesChange={onFilesChange}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
