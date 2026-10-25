import { ListItemNode, ListNode } from '@lexical/list'
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  HEADING,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST,
} from '@lexical/markdown'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { describe, expect, it } from 'vitest'
import {
  editorNodes,
  editorPlugins,
  enabledTextFormatMask,
  enabledTextFormats,
  markdownTransformers,
  slashMenuGroups,
} from '@/components/editor/features'
import { indentFeature } from '@/components/editor/features/indent'
import { ListTabPlugin } from '@/components/editor/features/list-tab'
import { filterSlashGroups } from '@/components/editor/slash-menu/slash-menu-items'
import { ALLOWED_TEXT_FORMAT } from '@/lib/document'

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
          'horizontalRule',
        ],
      ],
      ['lists', ['unorderedList', 'orderedList', 'checkList']],
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
    // Lafz ke shuru se: "ordered" ab "unordered" se nahi milta
    expect(found('ordered')).toEqual(['orderedList'])
    expect(found('numbered')).toEqual(['orderedList'])
    expect(found('list')).toEqual(['unorderedList', 'orderedList', 'checkList'])
    const item = slashMenuGroups.find((g) => g.key === 'lists')?.items[1]
    expect(item?.label).toBe('Ordered List')
  })

  it('register the "[ ] " shortcut, the check list plugin and find Check List like Payload', () => {
    expect(markdownTransformers).toContain(CHECK_LIST)
    expect(editorPlugins).toContain(CheckListPlugin)
    // Teeno list features ListPlugin aur Tab nesting laate hain — phir bhi ek dafa
    expect(editorPlugins.filter((p) => p === ListPlugin)).toHaveLength(1)
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    for (const q of ['check', 'checklist', 'check list', 'cl']) {
      expect(found(q)).toEqual(['checkList'])
    }
    const item = slashMenuGroups.find((g) => g.key === 'lists')?.items[2]
    expect(item?.label).toBe('Check List')
  })

  it('register the horizontal rule node, plugin, "--- " shortcut and find it like Payload', () => {
    expect(editorNodes).toContain(HorizontalRuleNode)
    expect(editorPlugins).toContain(HorizontalRulePlugin)
    const hr = markdownTransformers.find(
      (t) => t.type === 'element' && t.dependencies.includes(HorizontalRuleNode),
    )
    expect(hr?.type === 'element' && hr.regExp.test('---')).toBe(true)
    expect(hr?.type === 'element' && hr.regExp.test('--- ')).toBe(true)
    expect(hr?.type === 'element' && hr.regExp.test('---x')).toBe(false)
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    for (const q of ['hr', 'horizontal rule', 'horizontal', 'rule', 'line', 'separator']) {
      expect(found(q)).toEqual(['horizontalRule'])
    }
    // Owner (B7 fix): "rule" ke beech wala "ul" Horizontal Rule nahi dhoondta; "par" sirf Paragraph
    expect(found('ul')).not.toContain('horizontalRule')
    expect(found('par')).toEqual(['paragraph'])
    expect(slashMenuGroups[0].items.at(-1)?.label).toBe('Horizontal Rule')
  })

  it('register the indent plugins (Tab, limit/quote, Escape-then-Tab), with no slash item (B8)', () => {
    expect(indentFeature.plugins).toHaveLength(3)
    for (const plugin of indentFeature.plugins ?? []) expect(editorPlugins).toContain(plugin)
    expect(indentFeature.slashMenu).toBeUndefined()
    expect(indentFeature.markdown).toBeUndefined()
    // List ka Tab (nesting) bhi pehle jaisa register
    expect(editorPlugins).toContain(ListTabPlugin)
  })

  it('enable bold and italic with their shortcuts, matching the server (C2, C3)', () => {
    expect([...enabledTextFormats]).toEqual(['bold', 'italic'])
    for (const t of [
      BOLD_STAR,
      BOLD_UNDERSCORE,
      ITALIC_STAR,
      ITALIC_UNDERSCORE,
      BOLD_ITALIC_STAR,
      BOLD_ITALIC_UNDERSCORE,
    ]) {
      expect(markdownTransformers).toContain(t)
    }
    // Editor jo formats rakhta he, server bhi wahi qubool kare
    expect(enabledTextFormatMask).toBe(ALLOWED_TEXT_FORMAT)
    expect(enabledTextFormatMask).toBe(3)
  })

  it('check longer format marks first: *** before ** before * (C3)', () => {
    const at = (t: unknown) => markdownTransformers.indexOf(t as (typeof markdownTransformers)[0])
    expect(at(BOLD_ITALIC_STAR)).toBeLessThan(at(BOLD_STAR))
    expect(at(BOLD_STAR)).toBeLessThan(at(ITALIC_STAR))
    expect(at(BOLD_ITALIC_UNDERSCORE)).toBeLessThan(at(BOLD_UNDERSCORE))
    expect(at(BOLD_UNDERSCORE)).toBeLessThan(at(ITALIC_UNDERSCORE))
    // Element shortcuts (headings, lists, ...) pehle jaisi tarteeb me
    expect(at(HEADING)).toBeLessThan(at(QUOTE))
  })

  it('find headings in the slash menu by level and by word', () => {
    const found = (q: string) =>
      filterSlashGroups(slashMenuGroups, q).flatMap((g) => g.items.map((i) => i.key))
    expect(found('h2')).toEqual(['heading-2'])
    expect(found('heading')).toHaveLength(6)
    expect(found('heading5')).toEqual(['heading-5'])
  })
})
