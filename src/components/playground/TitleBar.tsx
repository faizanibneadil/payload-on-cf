'use client'

import {
  Code2,
  FolderGit2,
  GitFork,
  Loader2,
  LogIn,
  LogOut,
  Save,
  Share2,
  Shield,
  User as UserIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { normalizeTitle } from '@/lib/title-slug'
import { cn } from '@/lib/utils'

export interface SessionUser {
  id: number
  username: string
  role: 'admin' | 'user'
}

interface TitleBarProps {
  user: SessionUser | null
  title: string
  onTitleChange: (title: string) => void
  /** Sirf owner (ya naye draft) ka title edit ho sakta hai */
  titleEditable: boolean
  readOnly: boolean
  /** Draft = abhi database me save nahi hua */
  isDraft: boolean
  dirty: boolean
  busy: boolean
  ownerName: string | null
  onSave: () => void
  onFork: () => void
  onShare: () => void
  onOpenPlaygrounds: () => void
  onSignOut: () => void
  /** Unsaved changes ho to page chhodne se pehle confirm; false = ruk jao */
  confirmLeave: () => boolean
}

// Typing ke dauran sirf allowed characters rakho; spaces hyphen ban jate hain
const sanitizeTyping = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 50)

function TitleField({
  value,
  editable,
  onCommit,
}: {
  value: string
  editable: boolean
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  const commit = () => {
    const normalized = normalizeTitle(draft)
    if (!normalized) {
      setDraft(value) // khali naam allowed nahi — purana wapas
      return
    }
    setDraft(normalized)
    if (normalized !== value) onCommit(normalized)
  }

  return (
    <Input
      value={draft}
      readOnly={!editable}
      maxLength={50}
      spellCheck={false}
      aria-label="Project name"
      title={editable ? 'Project name (letters, numbers and hyphens)' : value}
      onChange={(e) => setDraft(sanitizeTyping(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(value)
          e.currentTarget.blur()
        }
      }}
      className={cn(
        'h-7 w-32 min-w-0 font-mono text-xs sm:w-52',
        !editable && 'border-transparent bg-transparent focus-visible:ring-0',
      )}
    />
  )
}

export default function TitleBar({
  user,
  title,
  onTitleChange,
  titleEditable,
  readOnly,
  isDraft,
  dirty,
  busy,
  ownerName,
  onSave,
  onFork,
  onShare,
  onOpenPlaygrounds,
  onSignOut,
  confirmLeave,
}: TitleBarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-card px-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          className="flex items-center gap-1.5"
          aria-label="Playground home"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault()
          }}
        >
          <Code2 className="size-4 text-primary" />
          <h1 className="hidden text-sm font-semibold tracking-tight sm:block">Playground</h1>
        </Link>
        <TitleField value={title} editable={titleEditable} onCommit={onTitleChange} />
        {dirty && !readOnly && (
          <span
            className="size-2 shrink-0 rounded-full bg-amber-500"
            title="Unsaved changes"
            role="status"
            aria-label="Unsaved changes"
          />
        )}
        {readOnly && (
          <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
            Read-only{ownerName ? ` · by ${ownerName}` : ''}
          </Badge>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {!readOnly && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={busy || (!isDraft && !dirty)}
            title="Save (Ctrl/Cmd + S)"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            <span className="hidden sm:inline">{isDraft ? 'Save as new' : 'Save'}</span>
          </Button>
        )}

        {readOnly && (
          <Button size="sm" onClick={onFork} disabled={busy} title="Fork into your own playground">
            {busy ? <Loader2 className="animate-spin" /> : <GitFork />}
            <span className="hidden sm:inline">Fork</span>
          </Button>
        )}

        {!isDraft && (
          <Button variant="ghost" size="icon-sm" onClick={onShare} title="Share" aria-label="Share">
            <Share2 />
          </Button>
        )}

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" aria-label="Account menu" className="max-w-32" />
              }
            >
              <UserIcon />
              <span className="hidden truncate sm:inline">{user.username}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel>Signed in as {user.username}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenPlaygrounds}>
                <FolderGit2 /> My playgrounds
              </DropdownMenuItem>
              {user.role === 'admin' && (
                <DropdownMenuItem render={<a href="/admin" />}>
                  <Shield /> Admin panel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            onClick={(e) => {
              if (!confirmLeave()) e.preventDefault()
            }}
          >
            <LogIn />
            <span className="hidden sm:inline">Sign in</span>
          </Link>
        )}

        {user && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={onOpenPlaygrounds}
            title="My playgrounds"
            aria-label="My playgrounds"
          >
            <FolderGit2 />
          </Button>
        )}
      </div>
    </header>
  )
}
