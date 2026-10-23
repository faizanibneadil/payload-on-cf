import type { Transformer } from '@lexical/markdown'
import type { Klass, LexicalEditor, LexicalNode } from 'lexical'
import type { SlashMenuGroup } from '../slash-menu/slash-menu-items'
import { headingFeature } from './heading'
import { paragraphFeature } from './paragraph'
import { type EditorFeature, SLASH_GROUPS } from './types'

/** Editor ke saare features — tarteeb = slash menu me items ki tarteeb */
export const editorFeatures: EditorFeature[] = [paragraphFeature, headingFeature]

export const editorNodes: Klass<LexicalNode>[] = editorFeatures.flatMap((f) => f.nodes ?? [])

export const markdownTransformers: Transformer[] = editorFeatures.flatMap((f) => f.markdown ?? [])

/** Features ke items unke group me (Payload ke groups ki tarteeb), khali group nahi */
export const slashMenuGroups: SlashMenuGroup<LexicalEditor>[] = SLASH_GROUPS.map((group) => ({
  ...group,
  items: editorFeatures.flatMap((f) => (f.slashMenu?.group === group.key ? f.slashMenu.items : [])),
})).filter((group) => group.items.length > 0)
