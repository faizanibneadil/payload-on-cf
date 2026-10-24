import { INSERT_ORDERED_LIST_COMMAND, ListItemNode, ListNode } from '@lexical/list'
import { ORDERED_LIST } from '@lexical/markdown'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { ListOrdered } from 'lucide-react'
import { useEffect } from 'react'
import { LIST_START_MAX, LIST_START_MIN } from '@/lib/document'
import type { EditorFeature } from './types'

/** List ka shuru number server ki hadd (1-9999) me — `0. ` ya paste ka `start="0"` bhi save ho sake */
function ListStartPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      editor.registerNodeTransform(ListNode, (node) => {
        const start = node.getStart()
        const fixed = Number.isInteger(start)
          ? Math.min(LIST_START_MAX, Math.max(LIST_START_MIN, start))
          : LIST_START_MIN
        if (fixed !== start) node.setStart(fixed)
      }),
    [editor],
  )
  return null
}

/**
 * Ordered (numbered) list — Payload ka OrderedListFeature: line ke shuru me `1. ` (koi bhi number,
 * list usi se shuru hoti he, owner), ya slash menu > Lists > Ordered List. Enter/Backspace bullet
 * list jaise (Lexical ka ListPlugin).
 */
export const orderedListFeature: EditorFeature = {
  key: 'orderedList',
  nodes: [ListNode, ListItemNode],
  markdown: [ORDERED_LIST],
  plugins: [ListPlugin, ListStartPlugin],
  slashMenu: {
    group: 'lists',
    items: [
      {
        key: 'orderedList',
        label: 'Ordered List',
        keywords: ['ordered list', 'ol', 'numbered'],
        icon: ListOrdered,
        onSelect: (editor) => {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        },
      },
    ],
  },
}
