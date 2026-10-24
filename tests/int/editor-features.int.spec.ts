import { HEADING, QUOTE } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { describe, expect, it } from 'vitest'
import { editorNodes, markdownTransformers, slashMenuGroups } from '@/components/editor/features'
import { filterSlashGroups } from '@/components/editor/slash-menu/slash-menu-items'

const keys = () => slashMenuGroups.map((g) => [g.key, g.items.map((i) => i.key)])

describe('editor features', () => {
  it('put Paragraph, Heading 1-6 and Blockquote in the Basic slash menu group, in order', () => {
    expect(keys()).toEqual([
      [
        'basic',
        [
          'paragraph',
          'heading-1',
          'heading-2',
          'heading-3',
          'heading-4',
          'heading-5',
          'heading-6',
          'blockquote',
        ],
      ],
    ])
    expect(slashMenuGroups[0].items.map((i) => i.label)).toContain('Heading 3')
  })

  it('register the heading node and the "# " markdown shortcut', () => {
    expect(editorNodes).toContain(HeadingNode)
    expect(markdownTransformers).toContain(HEADING)
  })

  it('register the quote node, the "> " shortcut and find it as "quote" or "blockquote"', () => {
    expect(editorNodes).toContain(QuoteNode)
    expect(markdownTransformers).toContain(QUOTE)
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    expect(found('quote')).toEqual(['blockquote'])
    expect(found('blockquote')).toEqual(['blockquote'])
  })

  it('find headings in the slash menu by level and by word', () => {
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    expect(found('h2')).toEqual(['heading-2'])
    expect(found('heading')).toHaveLength(6)
    expect(found('heading5')).toEqual(['heading-5'])
  })
})
