import type { Transformer } from '@lexical/markdown'
import type { Klass, LexicalEditor, LexicalNode } from 'lexical'
import type { SlashMenuItem } from '../slash-menu/slash-menu-items'

/** Slash menu ke groups (Payload ke keys); menu isi tarteeb me dikhata he */
export const SLASH_GROUPS = [
  { key: 'basic', label: 'Basic' },
  { key: 'lists', label: 'Lists' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'inlineBlocks', label: 'Inline blocks' },
] as const

export type SlashGroupKey = (typeof SLASH_GROUPS)[number]['key']

/**
 * Editor ka ek feature (Payload ke "feature" jaisa): apne nodes, markdown shortcuts aur slash menu items.
 * Har task ek feature file jodta he (`features/<naam>.ts`) aur `features/index.ts` me list karta he.
 */
export interface EditorFeature {
  key: string
  nodes?: Klass<LexicalNode>[]
  /** Typing ke dauraan markdown shortcuts (jaise `# `) */
  markdown?: Transformer[]
  slashMenu?: { group: SlashGroupKey; items: SlashMenuItem<LexicalEditor>[] }
}
