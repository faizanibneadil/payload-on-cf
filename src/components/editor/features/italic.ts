import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
} from '@lexical/markdown'
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
import { Italic } from 'lucide-react'
import type { EditorFeature } from './types'

/**
 * Italic — Payload ka ItalicFeature: toolbar button (format group me Bold ke baad), Ctrl/Cmd+I (Lexical
 * khud), markdown `*text*` aur `_text_`; bold ke saath `***text***` / `___text___` (Payload bhi italic
 * hone par hi jodta he). Quote (khud italic) ke andar italic lafz seedha dikhta he (owner, C3).
 */
export const italicFeature: EditorFeature = {
  key: 'italic',
  textFormats: ['italic'],
  markdown: [BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE, ITALIC_STAR, ITALIC_UNDERSCORE],
  toolbar: {
    group: 'format',
    items: [
      {
        key: 'italic',
        label: 'Italic',
        shortcut: 'Mod+I',
        icon: Italic,
        isActive: () => {
          const selection = $getSelection()
          return $isRangeSelection(selection) && selection.hasFormat('italic')
        },
        onSelect: (editor) => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
        },
      },
    ],
  },
}
