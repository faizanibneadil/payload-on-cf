import { INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from '@lexical/list'
import { UNORDERED_LIST } from '@lexical/markdown'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { List } from 'lucide-react'
import type { EditorFeature } from './types'

/**
 * Unordered (bullet) list — Payload ka UnorderedListFeature: line ke shuru me `- `, `* ` ya `+ `,
 * ya slash menu > Lists > Unordered List. Enter = naya item, khali item par Enter = list khatam
 * (Lexical ka ListPlugin).
 */
export const unorderedListFeature: EditorFeature = {
  key: 'unorderedList',
  nodes: [ListNode, ListItemNode],
  markdown: [UNORDERED_LIST],
  plugins: [ListPlugin],
  slashMenu: {
    group: 'lists',
    items: [
      {
        key: 'unorderedList',
        label: 'Unordered List',
        keywords: ['unordered list', 'ul', 'bullet'],
        icon: List,
        onSelect: (editor) => {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        },
      },
    ],
  },
}
