import { HEADING } from '@lexical/markdown'
import { $createHeadingNode, HeadingNode, type HeadingTagType } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $getSelection, $isRangeSelection } from 'lexical'
import { Heading1, Heading2, Heading3, Heading4, Heading5, Heading6 } from 'lucide-react'
import type { EditorFeature } from './types'

export const HEADING_TAGS: HeadingTagType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const icons = { h1: Heading1, h2: Heading2, h3: Heading3, h4: Heading4, h5: Heading5, h6: Heading6 }

/**
 * Headings H1-H6 (Payload ka HeadingFeature): `# ` se `###### ` tak line ke shuru me, ya slash menu.
 * Heading ke aakhir me Enter = naya paragraph; shuru me Backspace = wapas paragraph (Lexical khud).
 */
export const headingFeature: EditorFeature = {
  key: 'heading',
  nodes: [HeadingNode],
  markdown: [HEADING],
  slashMenu: {
    group: 'basic',
    items: HEADING_TAGS.map((tag) => ({
      key: `heading-${tag.charAt(1)}`,
      label: `Heading ${tag.charAt(1)}`,
      keywords: ['heading', tag],
      icon: icons[tag],
      onSelect: (editor) =>
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createHeadingNode(tag))
        }),
    })),
  },
}
