import type { Transformer } from '@lexical/markdown'
import type { Klass, LexicalEditor, LexicalNode } from 'lexical'
import type { ComponentType } from 'react'
import type { SlashMenuGroup } from '../slash-menu/slash-menu-items'
import { checkListFeature } from './check-list'
import { headingFeature } from './heading'
import { orderedListFeature } from './ordered-list'
import { paragraphFeature } from './paragraph'
import { quoteFeature } from './quote'
import { type EditorFeature, SLASH_GROUPS } from './types'
import { unorderedListFeature } from './unordered-list'

/** Editor ke saare features — tarteeb = slash menu me items ki tarteeb */
export const editorFeatures: EditorFeature[] = [
  paragraphFeature,
  headingFeature,
  quoteFeature,
  unorderedListFeature,
  orderedListFeature,
  checkListFeature,
]

// Ek node kai features me ho sakta he (lists) — ek hi dafa register
export const editorNodes: Klass<LexicalNode>[] = [
  ...new Set(editorFeatures.flatMap((f) => f.nodes ?? [])),
]

export const editorPlugins: ComponentType[] = [
  ...new Set(editorFeatures.flatMap((f) => f.plugins ?? [])),
]

export const markdownTransformers: Transformer[] = editorFeatures.flatMap((f) => f.markdown ?? [])

/** Features ke items unke group me (Payload ke groups ki tarteeb), khali group nahi */
export const slashMenuGroups: SlashMenuGroup<LexicalEditor>[] = SLASH_GROUPS.map((group) => ({
  ...group,
  items: editorFeatures.flatMap((f) => (f.slashMenu?.group === group.key ? f.slashMenu.items : [])),
})).filter((group) => group.items.length > 0)
