'use client'

import { type Editor, useEditorState } from '@tiptap/react'
import { Code2, List, ListOrdered, type LucideIcon, Minus, Table2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface SlashItem {
  id: string
  label: string
  hint: string
  keywords: string
  icon: LucideIcon
  run: (editor: Editor) => void
}

const ITEMS: SlashItem[] = [
  {
    id: 'bullet',
    label: 'Bullet list',
    hint: 'Tab to nest',
    keywords: 'bullet list ul unordered',
    icon: List,
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Numbered list',
    hint: 'Tab to nest',
    keywords: 'numbered ordered list ol',
    icon: ListOrdered,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'code',
    label: 'Code block',
    hint: 'Syntax highlighted',
    keywords: 'code block pre snippet',
    icon: Code2,
    run: (e) => e.chain().focus().setCodeBlock().run(),
  },
  {
    id: 'table',
    label: 'Table',
    hint: '3 × 3 with header',
    keywords: 'table grid',
    icon: Table2,
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: 'Horizontal line',
    keywords: 'divider hr rule line separator',
    icon: Minus,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
]

/**
 * "/" block menu: khali paragraph ki shuruaat me "/" (aur optional filter text) likhne par
 * list, code block, table, divider ka menu khulta hai.
 */
export function SlashMenu({ editor }: { editor: Editor }) {
  const slash = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { selection } = e.state
      if (!e.isEditable || !selection.empty) return null
      const { $from } = selection
      if ($from.parent.type.name !== 'paragraph') return null
      const text = $from.parent.textContent
      const match = /^\/(\w*)$/.exec(text)
      if (!match || $from.parentOffset !== text.length) return null
      return { query: match[1].toLowerCase(), start: $from.start(), end: $from.pos }
    },
  })

  const [index, setIndex] = useState(0)
  const query = slash?.query
  const items = query === undefined ? [] : ITEMS.filter((i) => i.keywords.includes(query))
  const open = slash !== null && items.length > 0

  // biome-ignore lint/correctness/useExhaustiveDependencies: query badalne par selection reset hota hai
  useEffect(() => {
    setIndex(0)
  }, [query])

  // Keyboard: ProseMirror se pehle pakadte hain (capture)
  useEffect(() => {
    if (!open || !slash) return
    const { start, end } = slash
    const choose = (item: SlashItem) => {
      editor.chain().focus().deleteRange({ from: start, to: end }).run()
      item.run(editor)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const step = event.key === 'ArrowDown' ? 1 : -1
        setIndex((i) => (i + step + items.length) % items.length)
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        choose(items[Math.min(index, items.length - 1)])
      } else if (event.key === 'Escape') {
        editor.chain().focus().deleteRange({ from: start, to: end }).run()
      } else {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const dom = editor.view.dom
    dom.addEventListener('keydown', onKeyDown, true)
    return () => dom.removeEventListener('keydown', onKeyDown, true)
  }, [open, slash, items, index, editor])

  if (!open || !slash) return null

  const coords = editor.view.coordsAtPos(slash.end)
  const pick = (item: SlashItem) => {
    editor.chain().focus().deleteRange({ from: slash.start, to: slash.end }).run()
    item.run(editor)
  }

  return (
    <div
      role="listbox"
      aria-label="Insert block"
      className="fixed z-40 w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: coords.left, top: coords.bottom + 6 }}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === index}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setIndex(i)}
          onClick={() => pick(item)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
            i === index && 'bg-accent text-accent-foreground',
          )}
        >
          <item.icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">{item.label}</span>
          <span className="text-muted-foreground text-xs">{item.hint}</span>
        </button>
      ))}
    </div>
  )
}
