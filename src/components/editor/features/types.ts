import type { Transformer } from '@lexical/markdown'
import type { Klass, LexicalEditor, LexicalNode } from 'lexical'
import type { ComponentType } from 'react'
import type { ToolbarGroupKey, ToolbarItem } from '../inline-toolbar/toolbar-items'
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
 * Editor ka ek feature (Payload ke "feature" jaisa): apne nodes, markdown shortcuts, slash menu items aur
 * inline toolbar ke buttons.
 * Har task ek feature file jodta he (`features/<naam>.ts`) aur `features/index.ts` me list karta he.
 */
export interface EditorFeature {
  key: string
  nodes?: Klass<LexicalNode>[]
  /** Typing ke dauraan markdown shortcuts (jaise `# `) */
  markdown?: Transformer[]
  slashMenu?: { group: SlashGroupKey; items: SlashMenuItem<LexicalEditor>[] }
  /** Inline toolbar ke buttons, apne group me (Payload ki tarteeb, `TOOLBAR_GROUPS`) */
  toolbar?: { group: ToolbarGroupKey; items: ToolbarItem<LexicalEditor>[] }
  /** Lexical plugins jo is feature ko chahiyen (jaise lists ka ListPlugin) */
  plugins?: ComponentType[]
}
