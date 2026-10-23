'use client'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { mergeRegister } from '@lexical/utils'
import {
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  ParagraphNode,
  TextNode,
} from 'lexical'
import { useEffect } from 'react'
import { useBoard } from '@/components/board/board-store'
import type { BoardDocument } from '@/lib/document'
import { SlashMenuPlugin } from './slash-menu/slash-menu-plugin'
import { documentClass, editorTheme } from './theme'

// Typing rukne ke itni der baad document board tak pahunchta hai ("Unsaved changes" ke liye)
const SYNC_DELAY_MS = 300

/**
 * Board ka Lexical editor (sirf owner/admin). Is task me sirf paragraphs: formatting, alignment aur
 * indent apne apne task me aayenge, tab tak inhein band rakha he (paste ya shortcut se bhi na aayen).
 */
export function BoardEditor() {
  const { initialDoc } = useBoard()
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'board',
        theme: editorTheme,
        nodes: [],
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
      <SlashMenuPlugin />
      <ParagraphsOnlyPlugin />
      <BoardSyncPlugin />
    </LexicalComposer>
  )
}

/** Abhi sirf saade paragraphs: bold/italic, alignment, indent waghera ke commands aur paste ka style hatao */
function ParagraphsOnlyPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    const block = () => true
    return mergeRegister(
      editor.registerCommand(FORMAT_TEXT_COMMAND, block, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(FORMAT_ELEMENT_COMMAND, block, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(INDENT_CONTENT_COMMAND, block, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(OUTDENT_CONTENT_COMMAND, block, COMMAND_PRIORITY_CRITICAL),
      editor.registerNodeTransform(TextNode, (node) => {
        if (node.getFormat() !== 0) node.setFormat(0)
        if (node.getStyle() !== '') node.setStyle('')
      }),
      editor.registerNodeTransform(ParagraphNode, (node) => {
        if (node.getFormatType() !== '') node.setFormat('')
        if (node.getIndent() !== 0) node.setIndent(0)
      }),
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
