import { QUOTE } from '@lexical/markdown'
import { $createQuoteNode, QuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $getSelection, $isRangeSelection } from 'lexical'
import { TextQuote } from 'lucide-react'
import type { EditorFeature } from './types'

/**
 * Quote (Payload ka BlockquoteFeature): line ke shuru me `> `, ya slash menu > Blockquote.
 * Shift+Enter quote ke andar nayi line; Enter quote ke baad naya paragraph (Lexical khud).
 */
export const quoteFeature: EditorFeature = {
  key: 'quote',
  nodes: [QuoteNode],
  markdown: [QUOTE],
  slashMenu: {
    group: 'basic',
    items: [
      {
        key: 'blockquote',
        label: 'Blockquote',
        keywords: ['quote', 'blockquote'],
        icon: TextQuote,
        onSelect: (editor) =>
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createQuoteNode())
          }),
      },
    ],
  },
}
