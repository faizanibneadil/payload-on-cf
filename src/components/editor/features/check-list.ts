import { INSERT_CHECK_LIST_COMMAND, ListItemNode, ListNode } from '@lexical/list'
import { CHECK_LIST } from '@lexical/markdown'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { ListChecks } from 'lucide-react'
import { ListTabPlugin } from './list-tab'
import type { EditorFeature } from './types'

/**
 * Check list — Payload ka ChecklistFeature: line ke shuru me `[ ] ` / `[x] ` (Payload jaisa), ya slash
 * menu > Lists > Check List. Dabbe par click (ya item ke shuru me ← phir Space) se tick lagta/hatta he
 * (Lexical ka CheckListPlugin); tick bhi baqi tabdeeliyon ki tarah Save se save hota he.
 */
export const checkListFeature: EditorFeature = {
  key: 'checkList',
  nodes: [ListNode, ListItemNode],
  markdown: [CHECK_LIST],
  plugins: [ListPlugin, ListTabPlugin, CheckListPlugin],
  slashMenu: {
    group: 'lists',
    items: [
      {
        key: 'checkList',
        label: 'Check List',
        keywords: ['check list', 'check', 'checklist', 'cl'],
        icon: ListChecks,
        onSelect: (editor) => {
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
        },
      },
    ],
  },
}
