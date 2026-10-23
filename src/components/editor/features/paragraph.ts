import { $setBlocksType } from '@lexical/selection'
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical'
import { Type } from 'lucide-react'
import type { EditorFeature } from './types'

/** Paragraph (Lexical ka apna node) — slash menu se kisi bhi line ko wapas saada text banana */
export const paragraphFeature: EditorFeature = {
  key: 'paragraph',
  slashMenu: {
    group: 'basic',
    items: [
      {
        key: 'paragraph',
        label: 'Paragraph',
        keywords: ['normal', 'paragraph', 'p', 'text'],
        icon: Type,
        onSelect: (editor) =>
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createParagraphNode())
            }
          }),
      },
    ],
  },
}
