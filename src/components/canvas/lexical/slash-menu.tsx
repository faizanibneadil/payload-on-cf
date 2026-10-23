'use client'

import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { $createHeadingNode, type HeadingTagType } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  type ElementNode,
  type LexicalEditor,
  type RangeSelection,
} from 'lexical'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  Pilcrow,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

class SlashOption extends MenuOption {
  constructor(
    readonly title: string,
    readonly Icon: LucideIcon,
    readonly keywords: string[],
    readonly run: (editor: LexicalEditor) => void,
  ) {
    super(title)
  }
}

const setBlock = (create: () => ElementNode) => (editor: LexicalEditor) =>
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) $setBlocksType(selection, create)
  })

const heading = (tag: HeadingTagType) => setBlock(() => $createHeadingNode(tag))

// Abhi sirf text ke blocks; UI elements (components) baad ke qadam me isi menu me aayenge
const OPTIONS = [
  new SlashOption('Text', Pilcrow, ['paragraph', 'p'], setBlock($createParagraphNode)),
  new SlashOption('Heading 1', Heading1, ['h1', 'title'], heading('h1')),
  new SlashOption('Heading 2', Heading2, ['h2', 'subtitle'], heading('h2')),
  new SlashOption('Heading 3', Heading3, ['h3'], heading('h3')),
  new SlashOption('Bulleted list', List, ['ul', 'unordered', 'bullet'], (editor) =>
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
  ),
  new SlashOption('Numbered list', ListOrdered, ['ol', 'ordered', 'number'], (editor) =>
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
  ),
  new SlashOption('To-do list', ListChecks, ['todo', 'task', 'check', 'checkbox'], (editor) =>
    editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
  ),
]

/** "/" likhne par menu: headings, lists, to-do. Likhte jao to list chhoti hoti jati hai. */
export function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext()
  const [query, setQuery] = useState<string | null>(null)
  const triggerFn = useBasicTypeaheadTriggerMatch('/', { minLength: 0 })

  const options = useMemo(() => {
    if (!query) return OPTIONS
    const q = query.toLowerCase()
    return OPTIONS.filter(
      (o) => o.title.toLowerCase().includes(q) || o.keywords.some((k) => k.includes(q)),
    )
  }, [query])

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      options={options}
      onQueryChange={setQuery}
      triggerFn={triggerFn}
      commandPriority={COMMAND_PRIORITY_NORMAL}
      onSelectOption={(option, _textNode, closeMenu) => {
        // "/" se caret tak ka likha hua hatao, phir option lagao (ek hi update me). Lexical ka diya hua
        // query tez typing me purana ho sakta hai, is liye line ka text caret tak khud padho.
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            const before = textBeforeCaret(selection)
            const slash = before.lastIndexOf('/')
            if (slash >= 0) {
              for (let i = slash; i < before.length; i++) selection.deleteCharacter(true)
            }
          }
          option.run(editor)
          closeMenu()
        })
      }}
      menuRenderFn={(anchorRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorRef.current && options.length
          ? createPortal(
              <div
                role="listbox"
                aria-label="Insert block"
                data-testid="slash-menu"
                className="mt-1 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                // Portal ke events React tree me canvas tak jate hain: canvas isay khali jagah ka click na samjhe
                onPointerDown={(event) => event.stopPropagation()}
              >
                {options.map((option, i) => (
                  <div
                    key={option.key}
                    ref={option.setRefElement}
                    role="option"
                    tabIndex={-1}
                    aria-selected={selectedIndex === i}
                    data-testid={`slash-${option.title.toLowerCase().replace(/\W+/g, '-')}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm [&_svg]:size-4 [&_svg]:text-muted-foreground',
                      selectedIndex === i && 'bg-muted',
                    )}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setHighlightedIndex(i)
                      selectOptionAndCleanUp(option)
                    }}
                  >
                    <option.Icon />
                    {option.title}
                  </div>
                ))}
              </div>,
              anchorRef.current,
            )
          : null
      }
    />
  )
}

/** Caret wali line ka text, line ke shuru se caret tak */
function textBeforeCaret(selection: RangeSelection): string {
  const anchor = selection.anchor
  const node = anchor.getNode()
  const block = node.getTopLevelElement()
  if (!block) return ''
  let text = ''
  for (const leaf of block.getAllTextNodes()) {
    if (anchor.type === 'text' && leaf.is(node))
      return text + leaf.getTextContent().slice(0, anchor.offset)
    text += leaf.getTextContent()
  }
  return text
}
