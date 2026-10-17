'use client'

import { type Editor, useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Quote,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const BAR_CLASS =
  'z-30 flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md'

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Editor ka focus / selection na jaye
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(active && 'bg-accent text-accent-foreground')}
    >
      {children}
    </Button>
  )
}

const Divider = () => <span className="mx-0.5 h-4 w-px bg-border" />

/**
 * Selection par nazar aane wali inline toolbar (text formatting) aur table ke andar
 * table tools. Read-only users ko kuch nahi dikhta.
 */
export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
    }),
  })

  const openLink = () => {
    setLinkUrl((editor.getAttributes('link').href as string | undefined) ?? '')
    setLinkOpen(true)
  }

  const applyLink = () => {
    const url = linkUrl.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!url) chain.unsetLink().run()
    else chain.setLink({ href: url }).run()
    setLinkOpen(false)
  }

  return (
    <>
      <BubbleMenu
        editor={editor}
        className={BAR_CLASS}
        options={{ placement: 'top', offset: 8 }}
        shouldShow={({ editor: e, state: s }) =>
          e.isEditable &&
          !s.selection.empty &&
          !e.isActive('codeBlock') &&
          s.doc.textBetween(s.selection.from, s.selection.to).length > 0
        }
      >
        <ToolButton
          label="Bold"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label="Underline"
          active={state.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </ToolButton>
        <ToolButton label="Link" active={state.link} onClick={openLink}>
          <Link2 />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Heading 1"
          active={state.h1}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 />
        </ToolButton>
        <ToolButton
          label="Heading 2"
          active={state.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </ToolButton>
        <ToolButton
          label="Heading 3"
          active={state.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 />
        </ToolButton>
        <ToolButton
          label="Quote"
          active={state.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolButton>
      </BubbleMenu>

      <BubbleMenu
        editor={editor}
        pluginKey="tableTools"
        className={BAR_CLASS}
        options={{ placement: 'top-start', offset: 8 }}
        shouldShow={({ editor: e, state: s }) =>
          e.isEditable && s.selection.empty && e.isActive('table')
        }
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          + Row
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          + Column
        </Button>
        <ToolButton label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
          <Trash2 />
        </ToolButton>
      </BubbleMenu>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Link</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              applyLink()
            }}
            className="space-y-4"
          >
            <Input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com (empty to remove)"
              aria-label="Link URL"
            />
            <DialogFooter>
              <Button type="submit">Apply</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
