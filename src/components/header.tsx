'use client'

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { ThemeToggle } from './theme-toggle'
import { Button } from '@/components/ui/button'
import { normalizeTitle } from '@/lib/title-slug'
import { Save, GitFork, Share2, LogIn, Code2, BookOpen, Circle } from 'lucide-react'

interface HeaderProps {
  activeTab: 'theory' | 'practical'
  setActiveTab: (tab: 'theory' | 'practical') => void
  title: string
  setTitle: (title: string) => void
  isOwner: boolean
  isDirty: boolean
  saving: boolean
  onSave: () => void
  onFork: () => void
  slug?: string
}

export function Header({
  activeTab,
  setActiveTab,
  title,
  setTitle,
  isOwner,
  isDirty,
  saving,
  onSave,
  onFork,
  slug,
}: HeaderProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const normalized = normalizeTitle(raw)
    setTitle(normalized)
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Code Playground',
          url,
        })
        showToast('Shared successfully!')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(url)
        }
      }
    } else {
      await copyToClipboard(url)
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied to clipboard!')
    } catch {
      showToast('Failed to copy link.')
    }
  }

  const loginRedirect = `/admin/login?redirect=${encodeURIComponent(pathname)}`

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background px-4">
      {/* Left: Tabs */}
      <div className="flex items-center space-x-1">
        <Button
          variant={activeTab === 'practical' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('practical')}
          className="gap-1.5"
        >
          <Code2 className="size-4" />
          <span>Practical</span>
        </Button>
        <Button
          variant={activeTab === 'theory' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('theory')}
          className="gap-1.5"
        >
          <BookOpen className="size-4" />
          <span>Theory</span>
        </Button>
      </div>

      {/* Center: Title */}
      {user && (
        <div className="flex max-w-xs flex-1 items-center justify-center px-2">
          {isOwner && isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false)
              }}
              autoFocus
              maxLength={50}
              className="w-full rounded border border-ring bg-background px-2 py-0.5 text-center text-sm font-semibold text-foreground outline-none"
              placeholder="untitled"
            />
          ) : (
            <span
              onClick={() => {
                if (isOwner) setIsEditingTitle(true)
              }}
              className={`truncate text-sm font-semibold transition-colors ${
                isOwner ? 'cursor-pointer hover:text-muted-foreground' : ''
              }`}
              title={isOwner ? 'Click to edit title' : title}
            >
              {title || 'untitled'}
            </span>
          )}
        </div>
      )}

      {/* Right Toolbar */}
      <div className="flex items-center space-x-2">
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in slide-in-from-bottom-2">
            {toastMessage}
          </div>
        )}

        {/* Anonymous User Header Controls */}
        {!user && !loading && (
          <>
            <ThemeToggle />
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(loginRedirect)}
              className="gap-1.5"
            >
              <LogIn className="size-4" />
              <span>Login</span>
            </Button>
          </>
        )}

        {/* Logged In User Header Controls */}
        {user && (
          <>
            {isDirty && (
              <span
                className="flex items-center text-xs text-amber-500 gap-1"
                title="Unsaved changes"
              >
                <Circle className="size-2 fill-amber-500 text-amber-500" />
                <span className="hidden sm:inline">Unsaved</span>
              </span>
            )}

            {isOwner ? (
              <Button
                variant="default"
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="gap-1.5"
              >
                <Save className="size-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onFork}
                disabled={saving}
                className="gap-1.5"
              >
                <GitFork className="size-4" />
                <span>{saving ? 'Forking...' : 'Fork'}</span>
              </Button>
            )}

            {slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1.5"
              >
                <Share2 className="size-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}

            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin')}
              title={`Logged in as ${user.username || user.email}`}
              className="hidden md:inline-flex text-xs"
            >
              {user.username || user.email}
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
