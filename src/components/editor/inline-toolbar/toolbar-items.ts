// Inline toolbar ke groups, items aur jagah ka hisaab — Payload jaisa: har feature apne buttons kisi group
// me jodta he. Yahan koi Lexical import nahi (unit test saada rahe).

import type { LucideIcon } from 'lucide-react'

/** Groups Payload ki tarteeb me (owner, C1): text type | formats | link | alignment | indent | colour */
export const TOOLBAR_GROUPS = [
  { key: 'textType', label: 'Text type' },
  { key: 'format', label: 'Format' },
  { key: 'link', label: 'Link' },
  { key: 'align', label: 'Alignment' },
  { key: 'indent', label: 'Indent' },
  { key: 'textState', label: 'Colour' },
] as const

export type ToolbarGroupKey = (typeof TOOLBAR_GROUPS)[number]['key']

export interface ToolbarItem<TEditor = unknown> {
  /** Har button ki pehchaan (test id bhi isi se) */
  key: string
  /** Tooltip aur `aria-label` */
  label: string
  /** Tooltip me shortcut, jaise "Ctrl+B" */
  shortcut?: string
  icon: LucideIcon
  /** Selection par ye format laga hua he? (Lexical `read` ke andar bulaya jata he) */
  isActive?: (editor: TEditor) => boolean
  onSelect: (editor: TEditor) => void
}

export interface ToolbarGroup<TEditor = unknown> {
  key: ToolbarGroupKey
  label: string
  items: ToolbarItem<TEditor>[]
}

/** Features ke items unke group me, `TOOLBAR_GROUPS` ki tarteeb; khali group nahi */
export function buildToolbarGroups<T>(
  entries: { group: ToolbarGroupKey; items: ToolbarItem<T>[] }[],
): ToolbarGroup<T>[] {
  return TOOLBAR_GROUPS.map((group) => ({
    ...group,
    items: entries.flatMap((e) => (e.group === group.key ? e.items : [])),
  })).filter((group) => group.items.length > 0)
}

interface Rect {
  top: number
  bottom: number
  left: number
  width: number
}

// Selection aur toolbar ke beech, aur screen ke kinaron se faasla
export const TOOLBAR_GAP = 8
export const TOOLBAR_EDGE = 8

/**
 * Toolbar kahan (fixed, screen ke hisaab se): selection ke oopar beech me; oopar jagah na ho (header ya
 * screen ka sira, `topLimit`) to neeche (owner, C1, Payload jaisa). Daen-baen screen ke andar rahe.
 */
export function toolbarPosition(
  selection: Rect,
  toolbar: { width: number; height: number },
  viewport: { width: number; height: number },
  topLimit = 0,
): { top: number; left: number; placement: 'top' | 'bottom' } {
  const above = selection.top - TOOLBAR_GAP - toolbar.height
  const placement = above >= topLimit + TOOLBAR_EDGE ? 'top' : 'bottom'
  const top = placement === 'top' ? above : selection.bottom + TOOLBAR_GAP
  const centre = selection.left + selection.width / 2 - toolbar.width / 2
  const maxLeft = viewport.width - toolbar.width - TOOLBAR_EDGE
  const left = Math.max(TOOLBAR_EDGE, Math.min(centre, maxLeft))
  return { top: Math.round(top), left: Math.round(left), placement }
}
