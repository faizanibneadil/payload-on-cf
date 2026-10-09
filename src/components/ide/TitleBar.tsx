'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PanelLeft,
  PanelLeftDashed as PanelLeftOff,
  PanelBottom,
  PanelBottomDashed as PanelBottomOff,
  PanelRight,
  PanelRightDashed as PanelRightOff,
  Share2,
  GitFork,
  User as UserIcon,
  LogOut,
  Shield,
  Code,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useIde } from './useIde'
import { normalizeTitle, validateTitle } from '@/lib/title-slug'

function LayoutToggle({
  label,
  keys,
  shown,
  onClick,
  On,
  Off,
}: {
  label: string
  keys: string
  shown: boolean
  onClick: () => void
  On: React.ComponentType<{ className?: string }>
  Off: React.ComponentType<{ className?: string }>
}) {
  const Icon = shown ? On : Off
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        aria-pressed={shown}
        aria-label={label}
        className={cn(
          'flex size-7 items-center justify-center rounded transition-colors hover:bg-accent',
          shown ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        <span className="text-background/60">{keys}</span>
      </TooltipContent>
    </Tooltip>
  )
}

export interface TitleBarProps {
  playground?: {
    id: string
    title: string
    slug: string
    owner: { id: string; username?: string } | string
  } | null
  currentUser?: {
    id: string
    username?: string
    role?: string
  } | null
}

export function TitleBar({ playground, currentUser }: TitleBarProps) {
  const { c, snap } = useIde()
  const router = useRouter()

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)

  const isOwner = Boolean(
    playground &&
      currentUser &&
      (currentUser.role === 'admin' ||
        (typeof playground.owner === 'object'
          ? playground.owner.id === currentUser.id
          : playground.owner === currentUser.id))
  )

  const currentTitle = playground?.title || snap.projectTitle || ''

  useEffect(() => {
    setTitleInput(currentTitle)
  }, [currentTitle])

  const handleTitleCommit = async () => {
    setIsEditingTitle(false)
    const trimmed = titleInput.trim() || `untitled-${playground?.id?.slice(0, 6) || 'playground'}`

    if (trimmed === playground?.title) return

    const err = validateTitle(trimmed)
    if (err) {
      toast.error(err)
      setTitleInput(playground?.title || '')
      return
    }

    if (!playground || !isOwner) return

    setIsSavingTitle(true)
    try {
      const res = await fetch(`/api/playgrounds/${playground.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })

      if (!res.ok) {
        const json: any = await res.json().catch(() => ({}))
        toast.error(json.errors?.[0]?.message || 'Failed to rename playground')
        setTitleInput(playground.title)
        return
      }

      const updated: any = await res.json()
      const newSlug = updated.doc?.slug || normalizeTitle(trimmed)

      toast.info(`Link changed to /p/${newSlug}`)
      router.replace(`/p/${newSlug}`)
    } catch {
      toast.error('Failed to save title')
      setTitleInput(playground.title)
    } finally {
      setIsSavingTitle(false)
    }
  }

  const handleShare = async () => {
    if (!playground) return
    const publicUrl = `${window.location.origin}/p/${playground.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: playground.title, url: publicUrl })
        return
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(publicUrl)
    toast.success('Link copied to clipboard')
  }

  const handleFork = async () => {
    if (!currentUser) {
      router.push(`/admin/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    toast.info('Forking playground...')
    try {
      const res = await fetch('/api/playgrounds/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playgroundId: playground?.id }),
      })

      if (!res.ok) {
        const data: any = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to fork playground')
        return
      }

      const data: any = await res.json()
      if (data.slug) {
        toast.success('Playground forked successfully')
        router.push(`/p/${data.slug}`)
      }
    } catch {
      toast.error('Failed to fork playground')
    }
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-b bg-sidebar px-3 text-sm">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
        title="Playground Home"
      >
        <span className="inline-block size-2.5 rounded-full bg-primary" />
        Playground
      </Link>

      <div className="flex-1 truncate text-center text-xs text-muted-foreground">
        {playground && isOwner ? (
          isEditingTitle ? (
            <input
              type="text"
              className="mx-auto w-64 rounded border bg-background px-2 py-0.5 text-center text-xs text-foreground outline-none ring-1 ring-primary"
              value={titleInput}
              disabled={isSavingTitle}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleCommit()
                if (e.key === 'Escape') {
                  setIsEditingTitle(false)
                  setTitleInput(playground.title)
                }
              }}
              onBlur={handleTitleCommit}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="hover:underline focus:outline-none font-medium text-foreground"
              title="Click to rename"
            >
              {playground.title}
            </button>
          )
        ) : (
          <span>{currentTitle || 'a real dev server, in your browser'}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <LayoutToggle
          label="Toggle Sidebar"
          keys="⌘B"
          shown={!snap.sidebarCollapsed}
          onClick={() => c.toggleSidebar()}
          On={PanelLeft}
          Off={PanelLeftOff}
        />
        <LayoutToggle
          label="Toggle Panel"
          keys="⌘J"
          shown={!snap.panelCollapsed}
          onClick={() => c.togglePanel()}
          On={PanelBottom}
          Off={PanelBottomOff}
        />
        <LayoutToggle
          label="Toggle Preview"
          keys="⌥⌘B"
          shown={!snap.previewCollapsed}
          onClick={() => c.togglePreview()}
          On={PanelRight}
          Off={PanelRightOff}
        />

        <div aria-hidden className="mx-1 h-5 w-px bg-border" />

        {currentUser ? (
          <>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="size-4" /> Share
            </Button>
            {!isOwner && (
              <Button variant="ghost" size="sm" onClick={handleFork}>
                <GitFork className="size-4" /> Fork
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-2 font-medium">
                    <UserIcon className="size-4" />
                    {currentUser.username || 'Account'}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem onClick={() => router.push('/')}>
                  <Code className="size-4 mr-2" /> My playgrounds
                </DropdownMenuItem>
                {currentUser.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <Shield className="size-4 mr-2" /> Admin panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => (window.location.href = '/admin/logout')}>
                  <LogOut className="size-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                `/admin/login?redirect=${encodeURIComponent(
                  typeof window !== 'undefined' ? window.location.pathname : '/'
                )}`
              )
            }
          >
            Login
          </Button>
        )}
      </div>
    </div>
  )
}
