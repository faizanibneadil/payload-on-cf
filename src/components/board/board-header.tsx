'use client'

import { Check, Copy, Eye, Link2, Loader2, Save, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBoard } from './board-store'

/** Owner ke liye title input, baqi sab ke liye sirf text */
export function BoardTitle() {
  const { canEdit, title, setTitle, titleError, dirty } = useBoard()

  if (!canEdit) {
    return (
      <span className="block truncate font-medium" data-testid="board-title">
        {title}
      </span>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={50}
        aria-label="Board title"
        aria-invalid={titleError ? true : undefined}
        title={titleError ?? undefined}
        data-testid="board-title-input"
        className="h-7 w-full max-w-72 min-w-0 border-transparent bg-transparent px-1.5 font-medium shadow-none hover:border-input focus-visible:border-ring dark:bg-transparent"
      />
      {dirty ? (
        <span
          className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
          data-testid="unsaved-indicator"
        >
          <span className="size-2 rounded-full bg-amber-500" aria-hidden />
          <span className="hidden md:inline">Unsaved changes</span>
          <span className="sr-only md:hidden">Unsaved changes</span>
        </span>
      ) : null}
    </div>
  )
}

/** Header ke right side: owner = Share + Save, baqi = "View only" */
export function BoardActions() {
  const { canEdit, dirty, saving, save, titleError } = useBoard()

  if (!canEdit) {
    return (
      <Badge variant="outline" data-testid="view-only">
        <Eye />
        View only
      </Badge>
    )
  }

  return (
    <>
      <SharePopover />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="sm"
              onClick={() => void save()}
              disabled={!dirty || saving || Boolean(titleError)}
              data-testid="save-button"
            />
          }
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
        </TooltipTrigger>
        <TooltipContent>{dirty ? 'Save (Ctrl+S)' : 'All changes saved'}</TooltipContent>
      </Tooltip>
    </>
  )
}

function SharePopover() {
  const { slug, isShared, sharing, setShared } = useBoard()
  const [copied, setCopied] = useState(false)
  const [link, setLink] = useState(`/b/${slug}`)

  // Poora link sirf browser me pata hai (dev / production domain alag hain)
  useEffect(() => setLink(`${window.location.origin}/b/${slug}`), [slug])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.')
    }
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" data-testid="share-button" />}>
        {isShared ? <Link2 /> : <Share2 />}
        <span className="hidden sm:inline">{isShared ? 'Shared' : 'Share'}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80" data-testid="share-popover">
        <PopoverHeader>
          <PopoverTitle>Share this board</PopoverTitle>
          <PopoverDescription>
            Anyone with the link can view the board. Only you can change it.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between gap-3 rounded-md border p-2.5">
          <span className="grid gap-0.5">
            <span className="font-medium">Share with link</span>
            <span className="text-xs text-muted-foreground">
              {isShared ? 'On: the link works for everyone' : 'Off: only you can open it'}
            </span>
          </span>
          <Switch
            checked={isShared}
            disabled={sharing}
            onCheckedChange={(checked) => void setShared(checked)}
            aria-label="Share with link"
            data-testid="share-switch"
          />
        </div>
        <div className="flex gap-2">
          <Input
            readOnly
            value={link}
            aria-label="Board link"
            onFocus={(event) => event.currentTarget.select()}
            className="h-8 text-xs"
            data-testid="share-link"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void copy()}
            disabled={!isShared}
            data-testid="copy-link"
          >
            {copied ? <Check /> : <Copy />}
            Copy
          </Button>
        </div>
        {!isShared ? (
          <p className="text-xs text-muted-foreground">Turn sharing on to copy the link.</p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
