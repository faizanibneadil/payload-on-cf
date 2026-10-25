import { BOLD_STAR, BOLD_UNDERSCORE } from '@lexical/markdown'
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
import { Bold } from 'lucide-react'
import type { EditorFeature } from './types'

/**
 * Bold — Payload ka BoldFeature: toolbar button (format group me pehla), Ctrl/Cmd+B (Lexical khud),
 * markdown `**text**` aur `__text__`. Bold-italic (`***`) italic ke task (C3) me.
 */
export const boldFeature: EditorFeature = {
  key: 'bold',
  textFormats: ['bold'],
  markdown: [BOLD_STAR, BOLD_UNDERSCORE],
  toolbar: {
    group: 'format',
    items: [
      {
        key: 'bold',
        label: 'Bold',
        shortcut: 'Mod+B',
        icon: Bold,
        isActive: () => {
          const selection = $getSelection()
          return $isRangeSelection(selection) && selection.hasFormat('bold')
        },
        onSelect: (editor) => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
        },
      },
    ],
  },
}
