// Slash menu (`/`) ke groups aur items — Payload jaisa: har feature apna item kisi group me jodta he.
// Yahan koi Lexical import nahi (filter ka unit test saada rahe).

import type { LucideIcon } from 'lucide-react'

export interface SlashMenuItem<TEditor = unknown> {
  /** Har item ki pehchaan (test id bhi isi se) */
  key: string
  label: string
  /** Label ke ilawa jin lafzon se item mil jaye */
  keywords?: string[]
  icon: LucideIcon
  onSelect: (editor: TEditor) => void
}

export interface SlashMenuGroup<TEditor = unknown> {
  /** Payload ke group keys: `basic`, `lists`, `blocks`, `inlineBlocks` */
  key: string
  label: string
  items: SlashMenuItem<TEditor>[]
}

// Space, `-` aur `_` hata kar milao ("headingone" bhi "Heading 1" se mil jaye) — Payload jaisa
const normalize = (value: string) => value.toLowerCase().replace(/[\s\-_]/g, '')

/** `/` ke baad likhe lafz se items filter; khali group hat jata he, tarteeb wahi rehti he */
export function filterSlashGroups<T>(groups: SlashMenuGroup<T>[], query: string | null) {
  const q = normalize(query ?? '')
  const withItems = groups.filter((group) => group.items.length > 0)
  if (!q) return withItems
  return withItems
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [item.label, ...(item.keywords ?? [])].some((word) => normalize(word).includes(q)),
      ),
    }))
    .filter((group) => group.items.length > 0)
}
