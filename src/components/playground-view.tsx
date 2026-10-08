'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Header } from './header'
import { useAuth } from './auth-context'
import { PlaygroundData, savePlayground, forkPlayground } from '@/lib/api-playgrounds'

const TheoryEditor = dynamic(() => import('./theory-editor'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm text-muted-foreground">Loading Theory Editor...</div>,
})

const PracticalEditor = dynamic(() => import('./practical-editor'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm text-muted-foreground">Loading Practical Editor...</div>,
})

interface PlaygroundViewProps {
  initialPlayground?: PlaygroundData | null
}

export function PlaygroundView({ initialPlayground }: PlaygroundViewProps) {
  const { user } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'theory' | 'practical'>('practical')
  const [playground, setPlayground] = useState<PlaygroundData | null>(initialPlayground || null)
  const [title, setTitle] = useState<string>(initialPlayground?.title || 'my-playground')
  const [theory, setTheory] = useState<any>(initialPlayground?.theory || null)
  const [files, setFiles] = useState<any>(initialPlayground?.files || null)
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)

  const isOwner = Boolean(
    playground &&
      user &&
      (user.role === 'admin' ||
        (playground.owner &&
          (typeof playground.owner === 'object'
            ? String(playground.owner.id) === String(user.id)
            : String(playground.owner) === String(user.id))))
  )

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setIsDirty(true)
  }

  const handleTheoryChange = (newTheory: any) => {
    setTheory(newTheory)
    setIsDirty(true)
  }

  const handleFilesChange = (newFiles: any) => {
    setFiles(newFiles)
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!user) {
      router.push(`/admin/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setSaving(true)
    const result = await savePlayground(playground?.id, title, theory, files)
    setSaving(false)

    if (result.success && result.data) {
      setPlayground(result.data)
      setTitle(result.data.title)
      setIsDirty(false)

      if (!playground || playground.slug !== result.data.slug) {
        router.push(`/p/${result.data.slug}`)
      }
    } else {
      alert(result.error || 'Failed to save playground.')
    }
  }

  const handleFork = async () => {
    if (!user) {
      router.push(`/admin/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setSaving(true)
    const result = await forkPlayground(playground, title, theory, files)
    setSaving(false)

    if (result.success && result.data) {
      setIsDirty(false)
      router.push(`/p/${result.data.slug}`)
    } else {
      alert(result.error || 'Failed to fork playground.')
    }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title={title}
        setTitle={handleTitleChange}
        isOwner={isOwner || !playground}
        isDirty={isDirty}
        saving={saving}
        onSave={handleSave}
        onFork={handleFork}
        slug={playground?.slug}
      />

      <main className="flex-1 overflow-hidden relative">
        <div className={activeTab === 'practical' ? 'h-full w-full' : 'hidden'}>
          <PracticalEditor
            initialFiles={files}
            onChange={handleFilesChange}
            readOnly={Boolean(playground && !isOwner)}
          />
        </div>
        <div className={activeTab === 'theory' ? 'h-full w-full' : 'hidden'}>
          <TheoryEditor
            initialContent={theory}
            onChange={handleTheoryChange}
            readOnly={Boolean(playground && !isOwner)}
          />
        </div>
      </main>
    </div>
  )
}
