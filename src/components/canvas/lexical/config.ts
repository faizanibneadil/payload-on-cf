import { createHeadlessEditor } from '@lexical/headless'
import { ListItemNode, ListNode } from '@lexical/list'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  CHECK_LIST,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ORDERED_LIST,
  STRIKETHROUGH,
  type Transformer,
  UNORDERED_LIST,
} from '@lexical/markdown'
import { HeadingNode } from '@lexical/rich-text'
import type { EditorThemeClasses, Klass, LexicalNode, SerializedEditorState } from 'lexical'

/**
 * Text block ka Lexical setup — editor (edit mode) aur read view dono yahi use karte hain.
 * Block ka data markdown string hi rehta hai (Lexical ke markdown converters se), is liye purane
 * boards bina migration ke chalte hain aur data chhota rehta hai.
 */
export const NODES: Klass<LexicalNode>[] = [HeadingNode, ListNode, ListItemNode]

// Sirf woh cheezein jo markdown me save ho sakti hain (underline jaisi cheez save par gum ho jati)
// CHECK_LIST pehle, warna "- [ ] " bullet ban jata
export const TRANSFORMERS: Transformer[] = [
  HEADING,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  ITALIC_STAR,
  STRIKETHROUGH,
  INLINE_CODE,
]

// Editor aur read view ki classes ek jaisi: edit mode me jaane par kuch nahi hilta
export const THEME = {
  paragraph: 'md-p',
  heading: { h1: 'md-h1', h2: 'md-h2', h3: 'md-h3', h4: 'md-h4', h5: 'md-h5', h6: 'md-h6' },
  list: {
    ul: 'md-ul',
    ol: 'md-ol',
    checklist: 'md-checklist',
    listitem: 'md-li',
    listitemChecked: 'md-li-checked',
    listitemUnchecked: 'md-li-unchecked',
    nested: { listitem: 'md-li-nested' },
  },
  text: {
    bold: 'md-bold',
    italic: 'md-italic',
    strikethrough: 'md-strike',
    code: 'md-code',
  },
} satisfies EditorThemeClasses

// Saved markdown me khali lines bhi lines hain (purana format): newlines bachao
const PRESERVE_NEWLINES = true

export function $importMarkdown(markdown: string) {
  $convertFromMarkdownString(markdown, TRANSFORMERS, undefined, PRESERVE_NEWLINES)
}

export function $exportMarkdown() {
  return $convertToMarkdownString(TRANSFORMERS, undefined, PRESERVE_NEWLINES)
}

// ---------- Read view: markdown -> Lexical JSON (bina editor mount kiye) ----------

let headless: ReturnType<typeof createHeadlessEditor> | null = null
const cache = new Map<string, SerializedEditorState>()
const CACHE_LIMIT = 1000

/** Ek hi headless editor se parse; nateeja cache (pan/zoom par blocks baar baar mount hote hain) */
export function markdownToState(markdown: string): SerializedEditorState {
  const hit = cache.get(markdown)
  if (hit) return hit
  headless ??= createHeadlessEditor({
    namespace: 'board-read',
    nodes: NODES,
    onError: (error) => {
      throw error
    },
  })
  headless.update(() => $importMarkdown(markdown), { discrete: true })
  const state = headless.getEditorState().toJSON()
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
  cache.set(markdown, state)
  return state
}
