'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useId, useState, useTransition } from 'react'
import { createBoardAction } from '@/app/(frontend)/actions/boards'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { validateTitle } from '@/lib/title-slug'

// User menu aur home page dono se khulta hai — ek hi dialog, event ke zariye
const OPEN_EVENT = 'boards-open-new-board'

export function openNewBoardDialog() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function NewBoardButton(props: Omit<React.ComponentProps<typeof Button>, 'onClick'>) {
  return (
    <Button {...props} onClick={openNewBoardDialog}>
      <Plus data-icon="inline-start" />
      New board
    </Button>
  )
}

export function NewBoardDialog() {
  const router = useRouter()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const onOpen = () => {
      setError(undefined)
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = String(new FormData(event.currentTarget).get('title') ?? '')
    const check = validateTitle(title)
    if (check !== true) return setError(check)
    startTransition(async () => {
      const result = await createBoardAction({ title })
      if (!result.ok) return setError(result.error)
      setOpen(false)
      router.push(`/b/${result.slug}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm" data-testid="new-board-dialog">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
            <DialogDescription>
              Give your lecture board a title. You can change it later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
              Title
            </label>
            <Input
              id={id}
              name="title"
              maxLength={50}
              placeholder="e.g. CSS Flexbox basics"
              aria-invalid={error ? true : undefined}
              autoFocus
            />
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Up to 50 characters.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Create board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
