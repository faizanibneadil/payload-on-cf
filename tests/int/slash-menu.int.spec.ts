import { Type } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import {
  filterSlashGroups,
  type SlashMenuGroup,
} from '@/components/editor/slash-menu/slash-menu-items'

const item = (key: string, label: string, keywords?: string[]) => ({
  key,
  label,
  keywords,
  icon: Type,
  onSelect: () => {},
})

const groups: SlashMenuGroup[] = [
  {
    key: 'basic',
    label: 'Basic',
    items: [item('paragraph', 'Paragraph', ['normal', 'text']), item('h1', 'Heading 1', ['title'])],
  },
  { key: 'lists', label: 'Lists', items: [item('ul', 'Bulleted List', ['unordered'])] },
  { key: 'blocks', label: 'Blocks', items: [] },
]
const keys = (result: SlashMenuGroup[]) => result.map((g) => [g.key, g.items.map((i) => i.key)])

describe('slash menu filter', () => {
  it('shows every non-empty group in order when nothing is typed', () => {
    expect(keys(filterSlashGroups(groups, null))).toEqual([
      ['basic', ['paragraph', 'h1']],
      ['lists', ['ul']],
    ])
    expect(keys(filterSlashGroups(groups, ''))).toEqual(keys(filterSlashGroups(groups, null)))
  })

  it('matches labels without caring about case, spaces, hyphens or underscores', () => {
    expect(keys(filterSlashGroups(groups, 'PARA'))).toEqual([['basic', ['paragraph']]])
    expect(keys(filterSlashGroups(groups, 'heading1'))).toEqual([['basic', ['h1']]])
    expect(keys(filterSlashGroups(groups, 'bulleted-list'))).toEqual([['lists', ['ul']]])
  })

  it('matches keywords too', () => {
    expect(keys(filterSlashGroups(groups, 'text'))).toEqual([['basic', ['paragraph']]])
    expect(keys(filterSlashGroups(groups, 'unord'))).toEqual([['lists', ['ul']]])
  })

  it('drops groups with no match, and returns nothing when nothing matches', () => {
    expect(keys(filterSlashGroups(groups, 'title'))).toEqual([['basic', ['h1']]])
    expect(filterSlashGroups(groups, 'zzz')).toEqual([])
  })

  it('treats regex characters as plain text', () => {
    expect(() => filterSlashGroups(groups, '(')).not.toThrow()
    expect(filterSlashGroups(groups, '.*')).toEqual([])
  })
})
