'use client'

import { BookOpen, Code2, LogOut, Plus, Share2, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useState } from 'react'
import { createNewPlaygroundAction } from '@/app/(frontend)/actions'
import { logoutUserAction } from '@/app/(frontend)/login/actions'
import CorePlayground from '@/components/playground/CorePlayground'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DashboardViewProps {
  user: any
  playgrounds: any[]
}

export default function DashboardView({ user, playgrounds }: DashboardViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'my-playgrounds' | 'guest-playground'>(
    'my-playgrounds',
  )
  const [newTitle, setNewTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setIsCreating(true)
    setError(null)

    const res = await createNewPlaygroundAction(newTitle.trim())
    setIsCreating(false)

    if (res.success && res.slug) {
      setNewTitle('')
      router.push(`/p/${res.slug}`)
    } else {
      setError(res.error || 'Failed to create playground')
    }
  }

  const handleLogout = async () => {
    await logoutUserAction()
    router.refresh()
  }

  // If user is guest
  if (!user) {
    return (
      <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-4 py-2.5 bg-card">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">Playground</span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">
              Guest Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </header>

        {/* Playground area */}
        <div className="flex-1 overflow-hidden relative">
          <CorePlayground isReadOnly={false} />
        </div>
      </div>
    )
  }

  // Logged-in Dashboard
  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* Top Navigation */}
      <header className="flex items-center justify-between border-b px-6 py-3 bg-card">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">Playground</span>
          </div>

          <nav className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('my-playgrounds')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'my-playgrounds'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Playgrounds
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guest-playground')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'guest-playground'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Scratchpad
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            <span className="font-medium text-foreground">{user.username}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            className="gap-1.5 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'my-playgrounds' ? (
          <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Create Section */}
            <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">Create New Playground</h2>
              <form onSubmit={handleCreate} className="flex gap-3 max-w-lg">
                <Input
                  type="text"
                  placeholder="e.g. flexbox-practice"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={isCreating}
                  required
                />
                <Button type="submit" disabled={isCreating} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
              </form>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {/* List Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">Your Saved Playgrounds</h2>

              {playgrounds.length === 0 ? (
                <div className="text-center py-12 rounded-lg border border-dashed p-8">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">No playgrounds created yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a title above to start your first project!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playgrounds.map((pg) => (
                    <div
                      key={pg.id}
                      className="group flex flex-col justify-between rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
                            {pg.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(pg.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-6 pt-4 border-t">
                        <Link href={`/p/${pg.slug}`} className="flex-1">
                          <Button size="sm" variant="default" className="w-full">
                            Open
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/p/${pg.slug}`)
                            alert('Playground link copied to clipboard!')
                          }}
                          className="px-2.5"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <CorePlayground isReadOnly={false} />
          </div>
        )}
      </div>
    </div>
  )
}
