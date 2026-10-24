import { ListItemNode, ListNode } from '@lexical/list'
import { HEADING, ORDERED_LIST, QUOTE, UNORDERED_LIST } from '@lexical/markdown'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { describe, expect, it } from 'vitest'
import {
  editorNodes,
  editorPlugins,
  markdownTransformers,
  slashMenuGroups,
} from '@/components/editor/features'
import { ListTabPlugin } from '@/components/editor/features/list-tab'
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
      ['lists', ['unorderedList', 'orderedList']],
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

  it('register list nodes, the "- " shortcut, the list plugin and the Lists group item', () => {
    expect(editorNodes).toEqual(expect.arrayContaining([ListNode, ListItemNode]))
    expect(new Set(editorNodes).size).toBe(editorNodes.length)
    expect(markdownTransformers).toContain(UNORDERED_LIST)
    expect(editorPlugins).toContain(ListPlugin)
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    expect(found('ul')).toEqual(['unorderedList'])
    expect(found('bullet')).toEqual(['unorderedList'])
    expect(slashMenuGroups.find((g) => g.key === 'lists')?.label).toBe('Lists')
  })

  it('register the "1. " shortcut and find Ordered List as "ol" or "numbered"', () => {
    expect(markdownTransformers).toContain(ORDERED_LIST)
    // Dono list features ek hi ListPlugin laate hain, wo ek dafa
    expect(editorPlugins.filter((p) => p === ListPlugin)).toHaveLength(1)
    // Tab se nesting (B5 fix) — dono list features me, ek dafa
    expect(editorPlugins.filter((p) => p === ListTabPlugin)).toHaveLength(1)
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    expect(found('ol')).toEqual(['orderedList'])
    // "ordered" lafz "unordered" me bhi he
    expect(found('ordered')).toEqual(['unorderedList', 'orderedList'])
    expect(found('numbered')).toEqual(['orderedList'])
    expect(found('list')).toEqual(['unorderedList', 'orderedList'])
    const item = slashMenuGroups.find((g) => g.key === 'lists')?.items[1]
    expect(item?.label).toBe('Ordered List')
  })

  it('find headings in the slash menu by level and by word', () => {
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    expect(found('h2')).toEqual(['heading-2'])
    expect(found('heading')).toHaveLength(6)
    expect(found('heading5')).toEqual(['heading-5'])
  })
})
