'use client'

import { ArrowLeft, Code2, GitFork, Save, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import CorePlayground from '@/components/playground/CorePlayground'
import { Button } from '@/components/ui/button'
import { forkPlaygroundAction, savePlaygroundAction } from '../actions'

interface SharedPlaygroundViewProps {
  user: any
  playground: any
  initialFiles: any[]
}

export default function SharedPlaygroundView({
  user,
  playground,
  initialFiles,
}: SharedPlaygroundViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const ownerId = typeof playground.owner === 'object' ? playground.owner?.id : playground.owner
  const isOwner = user && (user.role === 'admin' || user.id === ownerId)

  const [theoryContent, setTheoryContent] = useState<any>(playground.theory)
  const [currentFiles, setCurrentFiles] = useState<any[]>(
    initialFiles.map((f) => ({ path: f.path, content: f.content })),
  )

  const handleSave = () => {
    if (!isOwner) return

    setSaveStatus('Saving...')
    startTransition(async () => {
      const res = await savePlaygroundAction(playground.id, theoryContent, currentFiles)
      if (res.success) {
        setSaveStatus('Saved!')
        setTimeout(() => setSaveStatus(null), 2000)
      } else {
        setSaveStatus(`Error: ${res.error}`)
      }
    })
  }

  const handleFork = () => {
    if (!user) {
      router.push('/login')
      return
    }

    startTransition(async () => {
      const res = await forkPlaygroundAction(playground.id)
      if (res.success && res.slug) {
        router.push(`/p/${res.slug}`)
      } else {
        alert(res.error || 'Failed to fork playground')
      }
    })
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b px-4 py-2 bg-card">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-base tracking-tight">{playground.title}</h1>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">
              {isOwner ? 'Owner' : 'Read Only'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="text-xs text-muted-foreground font-medium">{saveStatus}</span>
          )}

          {isOwner ? (
            <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-1.5">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          ) : (
            <Button size="sm" onClick={handleFork} disabled={isPending} className="gap-1.5">
              <GitFork className="h-4 w-4" />
              {isPending ? 'Forking...' : 'Fork'}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              alert('Playground URL copied to clipboard!')
            }}
            className="gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden relative">
        <CorePlayground
          initialTheory={playground.theory}
          initialFiles={initialFiles}
          isReadOnly={!isOwner}
          onTheoryChange={(content) => setTheoryContent(content)}
          onFilesChange={(files) => setCurrentFiles(files)}
        />
      </div>
    </div>
  )
}
