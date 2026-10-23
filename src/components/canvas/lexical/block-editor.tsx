'use client'

import { $generateNodesFromMarkdownString } from '@lexical/markdown'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { $isHeadingNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { mergeRegister } from '@lexical/utils'
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ESCAPE_COMMAND,
  PASTE_COMMAND,
} from 'lexical'
import { memo, useEffect, useRef } from 'react'
import { $exportMarkdown, $importMarkdown, NODES, THEME, TRANSFORMERS } from './config'
import { FloatingToolbarPlugin } from './floating-toolbar'
import { ListShortcutsPlugin } from './list-shortcuts'
import { SlashMenuPlugin } from './slash-menu'

/**
 * Edit mode wale block ka Lexical editor (ek waqt me sirf ek). Markdown se shuru hota hai aur har
 * badlav par markdown wapas deta hai — scene me wahi save hota hai.
 */
export const BlockEditor = memo(function BlockEditor({
  initialMarkdown,
  onChange,
  onExit,
  takePendingText,
}: {
  initialMarkdown: string
  onChange: (markdown: string) => void
  onExit: () => void
  takePendingText?: () => string
}) {
  const callbacks = useRef({ onChange, onExit })
  callbacks.current = { onChange, onExit }
  const exit = useRef(() => callbacks.current.onExit()).current

  // initialMarkdown sirf mount par chahiye
  const initialConfig = useRef({
    namespace: 'board-block',
    nodes: NODES,
    theme: THEME,
    onError: (error: Error) => {
      throw error
    },
    editorState: () => $importMarkdown(initialMarkdown),
  }).current

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: sirf events ko canvas tak jaane se rokta hai */}
      <div
        className="relative"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // Canvas ke shortcuts (Delete, V/H/T, undo) editing ke dauraan na chalein; Ctrl+S (Save) chale
          const mod = event.ctrlKey || event.metaKey
          if (!(mod && event.key.toLowerCase() === 's')) event.stopPropagation()
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="md-lines cursor-text outline-none"
              data-testid="text-editor"
              aria-label="Text block"
              spellCheck
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <ListShortcutsPlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) =>
          callbacks.current.onChange(editorState.read(() => $exportMarkdown()))
        }
      />
      <BehaviourPlugin onExit={exit} takePendingText={takePendingText} />
      <FloatingToolbarPlugin />
      <SlashMenuPlugin />
    </LexicalComposer>
  )
})

/** Focus, Escape, markdown paste, aur woh formatting jo markdown me save nahi hoti */
function BehaviourPlugin({
  onExit,
  takePendingText,
}: {
  onExit: () => void
  takePendingText?: () => string
}): null {
  const [editor] = useLexicalComposerContext()
  const take = useRef(takePendingText)
  take.current = takePendingText

  useEffect(() => {
    // Mount par caret aakhir me. Editor khulne tak type hue harf saath jod kar poora text markdown se
    // dobara padho, taake "# Title" jaise shortcuts bhi lagen
    editor.focus(
      () => {
        const extra = take.current?.() ?? ''
        editor.update(
          () => {
            if (extra) $importMarkdown($exportMarkdown() + extra)
            $getRoot().selectEnd()
          },
          { discrete: true },
        )
      },
      { defaultSelection: 'rootEnd' },
    )
  }, [editor])

  useEffect(
    () =>
      mergeRegister(
        // Escape = edit khatam. Lexical ka apna handler (sirf blur) EDITOR priority par hai, is liye LOW;
        // slash menu khula ho to wo (NORMAL) pehle usay band karta hai
        editor.registerCommand(
          KEY_ESCAPE_COMMAND,
          (event) => {
            event?.preventDefault()
            onExit()
            return true
          },
          COMMAND_PRIORITY_LOW,
        ),
        // Heading ke bilkul shuru me Backspace = wapas normal text (pichli line se jurta nahi)
        editor.registerCommand(
          KEY_BACKSPACE_COMMAND,
          (event) => {
            const selection = $getSelection()
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
            const block = selection.anchor.getNode().getTopLevelElement()
            if (!$isHeadingNode(block) || selection.anchor.offset !== 0) return false
            const first = block.getFirstDescendant()
            if (
              first &&
              !selection.anchor.getNode().is(first) &&
              !selection.anchor.getNode().is(block)
            )
              return false
            event?.preventDefault()
            $setBlocksType(selection, () => $createParagraphNode())
            return true
          },
          COMMAND_PRIORITY_LOW,
        ),
        // Underline/highlight waghera markdown me save nahi hote — save par gum ho jate, is liye band
        editor.registerCommand(
          FORMAT_TEXT_COMMAND,
          (format) => !['bold', 'italic', 'strikethrough', 'code'].includes(format),
          COMMAND_PRIORITY_HIGH,
        ),
        // Sirf plain text (markdown) paste ho to formatting ke saath lagao ("# Title", "- item")
        editor.registerCommand(
          PASTE_COMMAND,
          (event) => {
            if (!(event instanceof ClipboardEvent) || !event.clipboardData) return false
            const data = event.clipboardData
            if (
              data.types.includes('text/html') ||
              data.types.includes('application/x-lexical-editor')
            )
              return false
            const text = data.getData('text/plain')
            if (!text) return false
            event.preventDefault()
            editor.update(() => {
              const selection = $getSelection()
              if (!$isRangeSelection(selection)) return
              const nodes = $generateNodesFromMarkdownString(
                text.replace(/\r\n?/g, '\n'),
                TRANSFORMERS,
                true,
              )
              if (!nodes.length) return
              const anchor = selection.anchor.getNode().getTopLevelElement()
              // Khali line par paste: line ko pasted blocks se badal do (pehli line ka type bhi aaye)
              if (anchor && $isParagraphNode(anchor) && anchor.getTextContentSize() === 0) {
                let last = nodes[0]
                anchor.replace(last)
                for (const node of nodes.slice(1)) {
                  last.insertAfter(node)
                  last = node
                }
                if ($isElementNode(last) || $isTextNode(last)) last.selectEnd()
                return
              }
              selection.insertNodes(nodes)
            })
            return true
          },
          COMMAND_PRIORITY_HIGH,
        ),
      ),
    [editor, onExit],
  )
  return null
}
