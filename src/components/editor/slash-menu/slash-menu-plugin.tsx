'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  PUNCTUATION,
  type TriggerFn,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { $setBlocksType } from '@lexical/selection'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
  type TextNode,
} from 'lexical'
import { Type } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { filterSlashGroups, type SlashMenuGroup, type SlashMenuItem } from './slash-menu-items'

/**
 * Menu ke groups. Har text feature (headings, lists, ...) apne task me apna item yahan jodta he;
 * "Blocks" aur "Inline blocks" groups task F2 me aayenge.
 */
export const slashMenuGroups: SlashMenuGroup<LexicalEditor>[] = [
  {
    key: 'basic',
    label: 'Basic',
    items: [
      {
        key: 'paragraph',
        label: 'Paragraph',
        keywords: ['normal', 'paragraph', 'p', 'text'],
        icon: Type,
        onSelect: (editor) =>
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection))
              $setBlocksType(selection, () => $createParagraphNode())
          }),
      },
    ],
  },
]

class SlashOption extends MenuOption {
  item: SlashMenuItem<LexicalEditor>
  constructor(item: SlashMenuItem<LexicalEditor>) {
    super(item.key)
    this.item = item
  }
}

// Payload jaisa: `/` line ke shuru me, space ya `(` ke baad; uske baad bina space ke lafz (max 75)
const MAX_QUERY = 75
const slashTrigger: TriggerFn = (text) => {
  const valid = `[^/${PUNCTUATION}\\s]`
  const match = new RegExp(`(^|\\s|\\()([/]((?:${valid}){0,${MAX_QUERY}}))$`).exec(text)
  if (!match) return null
  return {
    leadOffset: match.index + match[1].length,
    matchingString: match[3],
    replaceableString: match[2],
  }
}

export function SlashMenuPlugin(): React.JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [query, setQuery] = useState<string | null>(null)

  const groups = useMemo(() => filterSlashGroups(slashMenuGroups, query), [query])
  // Keyboard (oopar/neeche) poori list par chalta he, groups ke aar paar
  const options = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => new SlashOption(item))),
    [groups],
  )

  const onSelectOption = useCallback(
    (option: SlashOption, textNode: TextNode | null, closeMenu: () => void) => {
      // Pehle "/lafz" hatao, phir item ka kaam — ek hi update me (ek undo step)
      editor.update(() => {
        textNode?.remove()
        option.item.onSelect(editor)
        closeMenu()
      })
    },
    [editor],
  )

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      options={options}
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      triggerFn={slashTrigger}
      menuRenderFn={(anchorRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorRef.current || options.length === 0) return null
        let index = -1
        return createPortal(
          <div
            role="listbox"
            aria-label="Insert"
            data-testid="slash-menu"
            className="z-50 mt-1 max-h-80 w-60 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
            // Menu par click se editor ka focus/selection na jaye
            onMouseDown={(event) => event.preventDefault()}
          >
            {groups.map((group) => (
              <div key={group.key} role="group" aria-label={group.label}>
                <div className="px-2 pt-1.5 pb-1 font-medium text-muted-foreground text-xs">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  index += 1
                  const i = index
                  const option = options[i]
                  const Icon = item.icon
                  return (
                    <button
                      key={item.key}
                      ref={(el) => option.setRefElement(el)}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={selectedIndex === i}
                      data-testid={`slash-item-${item.key}`}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none',
                        selectedIndex === i && 'bg-accent text-accent-foreground',
                      )}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => selectOptionAndCleanUp(option)}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>,
          anchorRef.current,
        )
      }}
    />
  )
}
