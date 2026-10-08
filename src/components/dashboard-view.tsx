'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { Button } from '@/components/ui/button'
import { fetchUserPlaygrounds, PlaygroundData } from '@/lib/api-playgrounds'
import { ThemeToggle } from './theme-toggle'
import { Code2, Plus, Trash2, ExternalLink, LayoutDashboard } from 'lucide-react'

interface DashboardViewProps {
  onOpenDefaultPlayground: () => void
}

export function DashboardView({ onOpenDefaultPlayground }: DashboardViewProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [playgrounds, setPlaygrounds] = useState<PlaygroundData[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlaygrounds = async () => {
    setLoading(true)
    const data = await fetchUserPlaygrounds()
    setPlaygrounds(data)
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      loadPlaygrounds()
    }
  }, [user])

  const handleDelete = async (id: number | string, title: string) => {
    if (!confirm(`Are you sure you want to delete playground "${title}"?`)) return

    try {
      const res = await fetch(`/api/playgrounds/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlaygrounds((prev) => prev.filter((p) => p.id !== id))
      } else {
        alert('Failed to delete playground.')
      }
    } catch {
      alert('Error deleting playground.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* Dashboard Top Navigation */}
      <header className="flex h-14 items-center justify-between border-b border-border px-6 bg-background">
        <div className="flex items-center space-x-2">
          <Code2 className="size-5 text-primary" />
          <span className="font-semibold text-base">Code Playground</span>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={onOpenDefaultPlayground}>
            Try Sandbox
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
            title="Admin Dashboard"
            className="gap-1.5"
          >
            <LayoutDashboard className="size-4" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Playgrounds</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.username || user?.email}! Manage your code playgrounds.
            </p>
          </div>
          <Button onClick={onOpenDefaultPlayground} className="gap-2">
            <Plus className="size-4" />
            <span>New Playground</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading playgrounds...
          </div>
        ) : playgrounds.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Code2 className="size-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">No playgrounds yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first interactive HTML/CSS/JS playground now.
            </p>
            <Button onClick={onOpenDefaultPlayground} className="gap-2">
              <Plus className="size-4" />
              <span>Create Playground</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playgrounds.map((pg) => (
              <div
                key={pg.id}
                className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 hover:border-primary transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-base truncate pr-2 group-hover:text-primary transition-colors">
                      {pg.title}
                    </h2>
                    <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      /p/{pg.slug}
                    </span>
                  </div>
                  {pg.createdAt && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Created {new Date(pg.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                  <Link href={`/p/${pg.slug}`}>
                    <Button variant="default" size="xs" className="gap-1.5">
                      <ExternalLink className="size-3" />
                      <span>Open</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDelete(pg.id!, pg.title)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete Playground"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
