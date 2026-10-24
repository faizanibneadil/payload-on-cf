import { $isListItemNode, type ListItemNode } from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $findMatchingParent } from '@lexical/utils'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical'
import { useEffect } from 'react'

/**
 * Selection ke saare list items — agar selection me koi bhi line list item nahi to null.
 * (List ke andar Tab hamesha nesting, text ke beech bhi; baqi lines ka indent `indent.ts` me.)
 */
export function $selectedListItems(): ListItemNode[] | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return null
  const items = new Map<string, ListItemNode>()
  for (const node of selection.getNodes()) {
    const item = $isListItemNode(node) ? node : $findMatchingParent(node, $isListItemNode)
    // List node khud (kai items chune hon) — uske items neeche getNodes me aa jate hain
    if (!item) {
      if (node.getType() === 'list') continue
      return null
    }
    items.set(item.getKey(), item)
  }
  return items.size > 0 ? [...items.values()] : null
}

/**
 * List me Tab = item andar (nested list), Shift+Tab = bahar — Lexical/Payload jaisa (ListItemNode ka
 * indent hi nesting he). Hadd (`MAX_LIST_INDENT`, server ki gehrai) indent feature ka Tab plugin lagata
 * he (`indent.ts`, `maxIndent`), taa ke Save na ruke.
 */
export function ListTabPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (!$selectedListItems()) return false
          event.preventDefault()
          return editor.dispatchCommand(
            event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
            undefined,
          )
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor],
  )
  return null
}
