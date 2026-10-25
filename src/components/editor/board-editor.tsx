'use client'

import { ListItemNode } from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { mergeRegister } from '@lexical/utils'
import {
  COMMAND_PRIORITY_CRITICAL,
  type ElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  ParagraphNode,
  TextNode,
} from 'lexical'
import { useEffect } from 'react'
import { useBoard } from '@/components/board/board-store'
import type { BoardDocument } from '@/lib/document'
import {
  editorNodes,
  editorPlugins,
  enabledTextFormatMask,
  enabledTextFormats,
  markdownTransformers,
} from './features'
import { InlineToolbarPlugin } from './inline-toolbar/inline-toolbar-plugin'
import { SlashMenuPlugin } from './slash-menu/slash-menu-plugin'
import { documentClass, editorTheme } from './theme'

// Typing rukne ke itni der baad document board tak pahunchta hai ("Unsaved changes" ke liye)
const SYNC_DELAY_MS = 300

/**
 * Board ka Lexical editor (sirf owner/admin). Features (`./features`) apne nodes, markdown shortcuts aur
 * slash menu items laate hain. Text formats sirf wahi jo features ne chalu kiye (C2 se bold); alignment
 * apne task me — tab tak band (paste ya shortcut se bhi na aayen).
 */
export function BoardEditor() {
  const { initialDoc } = useBoard()
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'board',
        theme: editorTheme,
        nodes: editorNodes,
        editorState: JSON.stringify(initialDoc),
        onError: (error) => {
          console.error(error)
        },
      }}
    >
      {/* Placeholder isi box ke hisaab se text ki jagah par */}
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              // Neeche ki khaali jagah par click bhi editor me jaye
              className={`${documentClass} min-h-[50vh]`}
              data-testid="board-editor"
              aria-label="Board content"
              aria-placeholder="Start writing your lecture..."
              placeholder={
                <div className="pointer-events-none absolute top-0 left-0 text-base leading-7 text-muted-foreground">
                  Start writing your lecture...
                </div>
              }
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <MarkdownShortcutPlugin transformers={markdownTransformers} />
      {editorPlugins.map((Plugin, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: list kabhi nahi badalti
        <Plugin key={i} />
      ))}
      <SlashMenuPlugin />
      <InlineToolbarPlugin />
      <NotYetPlugin />
      <BoardSyncPlugin />
    </LexicalComposer>
  )
}

const resetAlignment = (node: ElementNode) => {
  if (node.getFormatType() !== '') node.setFormat('')
}

/** Jo abhi bane nahi: baqi text formats, alignment waghera ke commands aur paste ka style/format hatao */
function NotYetPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    const block = () => true
    return mergeRegister(
      editor.registerCommand(
        FORMAT_TEXT_COMMAND,
        (format) => !enabledTextFormats.has(format),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(FORMAT_ELEMENT_COMMAND, block, COMMAND_PRIORITY_CRITICAL),
      editor.registerNodeTransform(TextNode, (node) => {
        const format = node.getFormat()
        if (format & ~enabledTextFormatMask) node.setFormat(format & enabledTextFormatMask)
        if (node.getStyle() !== '') node.setStyle('')
      }),
      // Khali line ka "agla likha text bold" wala format bhi sirf chalu formats
      editor.registerNodeTransform(ParagraphNode, (node) => {
        const format = node.getTextFormat()
        if (format & ~enabledTextFormatMask) node.setTextFormat(format & enabledTextFormatMask)
      }),
      // Alignment (B9) se pehle har line baen taraf (indent B8 se asal feature he)
      editor.registerNodeTransform(ParagraphNode, resetAlignment),
      editor.registerNodeTransform(HeadingNode, resetAlignment),
      editor.registerNodeTransform(QuoteNode, resetAlignment),
      editor.registerNodeTransform(ListItemNode, resetAlignment),
    )
  }, [editor])
  return null
}

/** Editor ka document board store tak: khulte hi baseline, phir har tabdeeli (thori der baad) */
function BoardSyncPlugin(): null {
  const [editor] = useLexicalComposerContext()
  const { setDoc, setBaseline, setFlushSource } = useBoard()

  useEffect(() => {
    const read = () => editor.getEditorState().toJSON() as unknown as BoardDocument
    setFlushSource(read)
    let ready = false
    let timer: ReturnType<typeof setTimeout> | undefined
    // Lexical ki shuru wali normalization ho chuki ho (agla frame), tab baseline
    const frame = requestAnimationFrame(() => {
      setBaseline(read())
      ready = true
    })
    const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (!ready || (dirtyElements.size === 0 && dirtyLeaves.size === 0)) return
      clearTimeout(timer)
      timer = setTimeout(() => setDoc(read()), SYNC_DELAY_MS)
    })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      unregister()
    }
  }, [editor, setDoc, setBaseline, setFlushSource])

  return null
}
