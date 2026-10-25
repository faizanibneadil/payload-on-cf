import type { Transformer } from '@lexical/markdown'
import {
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  TEXT_TYPE_TO_FORMAT,
  type TextFormatType,
} from 'lexical'
import type { ComponentType } from 'react'
import { buildToolbarGroups, type ToolbarGroup } from '../inline-toolbar/toolbar-items'
import type { SlashMenuGroup } from '../slash-menu/slash-menu-items'
import { boldFeature } from './bold'
import { checkListFeature } from './check-list'
import { headingFeature } from './heading'
import { horizontalRuleFeature } from './horizontal-rule'
import { indentFeature } from './indent'
import { italicFeature } from './italic'
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
  horizontalRuleFeature,
  unorderedListFeature,
  orderedListFeature,
  checkListFeature,
  indentFeature,
  boldFeature,
  italicFeature,
]

// Ek node kai features me ho sakta he (lists) — ek hi dafa register
export const editorNodes: Klass<LexicalNode>[] = [
  ...new Set(editorFeatures.flatMap((f) => f.nodes ?? [])),
]

export const editorPlugins: ComponentType[] = [
  ...new Set(editorFeatures.flatMap((f) => f.plugins ?? [])),
]

// Text formats me lamba nishan pehle (`***` bold-italic, phir `**` bold, phir `*` italic), warna chhota
// nishan pehle pakad leta; baqi transformers apni tarteeb me (sort stable he)
const tagLength = (t: Transformer) => (t.type === 'text-format' ? t.tag.length : 0)
export const markdownTransformers: Transformer[] = editorFeatures
  .flatMap((f) => f.markdown ?? [])
  .sort((a, b) => tagLength(b) - tagLength(a))

/** Features ke items unke group me (Payload ke groups ki tarteeb), khali group nahi */
export const slashMenuGroups: SlashMenuGroup<LexicalEditor>[] = SLASH_GROUPS.map((group) => ({
  ...group,
  items: editorFeatures.flatMap((f) => (f.slashMenu?.group === group.key ? f.slashMenu.items : [])),
})).filter((group) => group.items.length > 0)

/** Inline toolbar ke groups: features ke buttons Payload ki tarteeb me, khali group nahi */
export const toolbarGroups: ToolbarGroup<LexicalEditor>[] = buildToolbarGroups(
  editorFeatures.flatMap((f) => (f.toolbar ? [f.toolbar] : [])),
)

/** Chalu text formats (features ke) — baqi commands, paste aur shortcuts se nahi aate */
export const enabledTextFormats: ReadonlySet<TextFormatType> = new Set(
  editorFeatures.flatMap((f) => f.textFormats ?? []),
)

/** Unhi formats ke Lexical bits (server ka `ALLOWED_TEXT_FORMAT` isi ke barabar, unit test) */
export const enabledTextFormatMask = [...enabledTextFormats].reduce(
  (mask, format) => mask | TEXT_TYPE_TO_FORMAT[format],
  0,
)
