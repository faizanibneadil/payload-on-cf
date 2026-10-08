'use client'

import React, { useMemo } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { TRANSFORMERS } from '@lexical/markdown'
import { EditorState } from 'lexical'
import { FloatingToolbar } from './floating-toolbar'

interface TheoryEditorProps {
  initialContent?: Record<string, any> | null
  onChange?: (jsonContent: Record<string, any>) => void
  readOnly?: boolean
}

const defaultInitialState = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Welcome to the Theory Panel! Write your notes or markdown documentation here.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

export default function TheoryEditor({
  initialContent,
  onChange,
  readOnly = false,
}: TheoryEditorProps) {
  const initialEditorState = useMemo(() => {
    if (!initialContent || typeof initialContent !== 'object' || !initialContent.root) {
      return JSON.stringify(defaultInitialState)
    }
    return JSON.stringify(initialContent)
  }, [initialContent])

  const initialConfig = {
    namespace: 'TheoryEditor',
    editable: !readOnly,
    editorState: initialEditorState,
    onError: (error: Error) => console.error('Lexical Error:', error),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
    theme: {
      paragraph: 'mb-2 leading-relaxed text-foreground',
      heading: {
        h1: 'text-2xl font-bold mt-4 mb-2 text-foreground',
        h2: 'text-xl font-semibold mt-3 mb-2 text-foreground',
        h3: 'text-lg font-medium mt-2 mb-1 text-foreground',
      },
      list: {
        ul: 'list-disc list-inside mb-2 pl-4',
        ol: 'list-decimal list-inside mb-2 pl-4',
      },
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
        code: 'font-mono text-sm bg-muted px-1.5 py-0.5 rounded text-foreground',
      },
      quote: 'border-l-4 border-muted-foreground/30 pl-4 italic my-2 text-muted-foreground',
    },
  }

  const handleEditorChange = (editorState: EditorState) => {
    if (onChange && !readOnly) {
      const json = editorState.toJSON()
      onChange(json)
    }
  }

  return (
    <div className="relative w-full h-full p-4 overflow-y-auto bg-background min-h-[400px]">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative min-h-[350px]">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={`min-h-[350px] outline-none text-sm md:text-base ${
                  readOnly ? 'cursor-default' : 'cursor-text'
                }`}
              />
            }
            placeholder={
              !readOnly ? (
                <div className="absolute top-0 left-0 text-muted-foreground text-sm pointer-events-none">
                  Start typing or use markdown shortcuts (#, *, &gt;)...
                </div>
              ) : null
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          {!readOnly && <FloatingToolbar />}
          {!readOnly && <OnChangePlugin onChange={handleEditorChange} />}
        </div>
      </LexicalComposer>
    </div>
  )
}
