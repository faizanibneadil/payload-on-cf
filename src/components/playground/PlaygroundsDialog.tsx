'use client'

import { Copy, FolderGit2, GitFork, LogIn, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createPlaygroundAction, deletePlaygroundAction } from '@/app/(frontend)/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { normalizeTitle } from '@/lib/title-slug'
import { cn } from '@/lib/utils'

export interface PlaygroundListItem {
  id: number | string
  title: string
  slug: string
  updatedAt: string
  forked: boolean
}

interface PlaygroundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  signedIn: boolean
  items: PlaygroundListItem[]
  /** Abhi jo playground khula hai uska slug (list me highlight ke liye) */
  currentSlug?: string
  /** Unsaved changes ho to doosre playground par jane se pehle confirm; false = ruk jao */
  confirmLeave: () => boolean
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export default function PlaygroundsDialog({
  open,
  onOpenChange,
  signedIn,
  items,
  currentSlug,
  confirmLeave,
}: PlaygroundsDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [creating, startCreate] = useTransition()
  const [pendingDelete, setPendingDelete] = useState<PlaygroundListItem | null>(null)

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    const name = normalizeTitle(title)
    if (!name) {
      toast.error('Enter a name using letters, numbers or hyphens')
      return
    }
    if (!confirmLeave()) return
    startCreate(async () => {
      const res = await createPlaygroundAction({ title: name })
      if (res.success) {
        setTitle('')
        onOpenChange(false)
        router.push(`/p/${res.slug}`)
      } else {
        toast.error(res.error)
      }
    })
  }

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const confirmDelete = async () => {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    const res = await deletePlaygroundAction(target.id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`Deleted “${target.title}”`)
    // Jo playground khula hai wahi delete ho jaye to home par wapas
    if (target.slug === currentSlug) router.push('/')
    else router.refresh()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <FolderGit2 className="size-4" /> My playgrounds
            </DialogTitle>
            <DialogDescription>Open a project, or start a new one.</DialogDescription>
          </DialogHeader>

          {signedIn ? (
            <div className="flex min-h-0 flex-col">
              <form onSubmit={handleCreate} className="flex gap-2 border-b p-4">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="new-project-name"
                  maxLength={50}
                  aria-label="New playground name"
                  disabled={creating}
                />
                <Button type="submit" disabled={creating || !title.trim()}>
                  <Plus /> {creating ? 'Creating…' : 'Create'}
                </Button>
              </form>

              <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
                {items.length === 0 && (
                  <li className="p-8 text-center text-sm text-muted-foreground">
                    No playgrounds yet. Create your first one above.
                  </li>
                )}
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5',
                      item.slug === currentSlug && 'bg-accent/50',
                    )}
                  >
                    <Link
                      href={`/p/${item.slug}`}
                      onClick={(e) => {
                        if (!confirmLeave()) {
                          e.preventDefault()
                          return
                        }
                        onOpenChange(false)
                      }}
                      className="min-w-0 flex-1"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{item.title}</span>
                        {item.forked && (
                          <Badge variant="secondary" className="gap-1">
                            <GitFork className="size-3" /> fork
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Updated {formatDate(item.updatedAt)}
                      </span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Copy share link"
                      aria-label={`Copy share link for ${item.title}`}
                      onClick={() => copyLink(item.slug)}
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Delete"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-4 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to save your work, see your playgrounds and fork your classmates’ projects.
              </p>
              <div className="flex justify-center gap-2">
                <Link href="/login" className={buttonVariants()}>
                  <LogIn /> Sign in
                </Link>
                <Link href="/register" className={buttonVariants({ variant: 'outline' })}>
                  Register
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this playground?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” and all its files will be permanently deleted. Forks made by
              others are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
