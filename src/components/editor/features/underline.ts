import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
import { Underline } from 'lucide-react'
import type { EditorFeature } from './types'

/**
 * Underline — Payload ka UnderlineFeature: toolbar button (format group me Italic ke baad), Ctrl/Cmd+U
 * (Lexical khud). Markdown me underline nahi hota, is liye koi shortcut nahi (Payload jaisa).
 */
export const underlineFeature: EditorFeature = {
  key: 'underline',
  textFormats: ['underline'],
  toolbar: {
    group: 'format',
    items: [
      {
        key: 'underline',
        label: 'Underline',
        shortcut: 'Mod+U',
        icon: Underline,
        isActive: () => {
          const selection = $getSelection()
          return $isRangeSelection(selection) && selection.hasFormat('underline')
        },
        onSelect: (editor) => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
        },
      },
    ],
  },
}
