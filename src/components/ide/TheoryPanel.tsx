'use client'

import React, { useState, useEffect } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Save, Bold, Italic, Underline, Code, List, ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_TEXT_COMMAND, LexicalEditor } from 'lexical'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'

export interface TheoryPanelProps {
  playgroundId?: string
  initialContent?: any
  isOwner?: boolean
}

export const EMPTY_LEXICAL_DOC: any = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: [],
      },
    ],
  },
}

function FloatingToolbar() {
  const [editor] = useLexicalComposerContext()

  const format = (command: 'bold' | 'italic' | 'underline' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, command)
  }

  return (
    <div className="flex items-center gap-1 border-b bg-muted/40 p-1 text-xs">
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => format('bold')} title="Bold">
        <Bold className="size-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => format('italic')} title="Italic">
        <Italic className="size-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => format('underline')} title="Underline">
        <Underline className="size-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => format('code')} title="Code">
        <Code className="size-3.5" />
      </Button>
    </div>
  )
}

export function TheoryPanel({ playgroundId, initialContent, isOwner }: TheoryPanelProps) {
  const [content, setContent] = useState<any>(initialContent || EMPTY_LEXICAL_DOC)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent)
    }
  }, [initialContent])

  const handleSave = async () => {
    if (!playgroundId || !isOwner) {
      toast.info('Changes are local only. Fork to keep them.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/playgrounds/${playgroundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theory: content }),
      })

      if (!res.ok) {
        toast.error('Failed to save Theory content')
        return
      }

      setIsDirty(false)
      toast.success('Theory saved')
    } catch {
      toast.error('Failed to save Theory content')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      e.stopPropagation()
      void handleSave()
    }
  }

  const initialConfig = {
    namespace: 'TheoryEditor',
    theme: {},
    nodes: [HeadingNode, QuoteNode, ListItemNode, ListNode, CodeNode, LinkNode],
    editorState: content && content.root ? JSON.stringify(content) : undefined,
    onError(error: Error) {
      console.error(error)
    },
  }

  return (
    <div
      className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>THEORY</span>
          {isDirty && <span className="size-2 rounded-full bg-amber-500" title="Unsaved changes" />}
        </div>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            disabled={isSaving}
            onClick={handleSave}
          >
            <Save className="size-3.5" />
            Save
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 text-sm max-w-none">
        {isOwner ? (
          <LexicalComposer initialConfig={initialConfig}>
            <FloatingToolbar />
            <RichTextPlugin
              contentEditable={<ContentEditable className="min-h-[200px] outline-none p-2 border rounded mt-2" />}
              placeholder={<div className="text-muted-foreground text-xs p-2">Type theory content here...</div>}
              ErrorBoundary={({ children }) => <div>{children}</div>}
            />
            <HistoryPlugin />
            <OnChangePlugin
              onChange={(editorState) => {
                editorState.read(() => {
                  const json = editorState.toJSON()
                  setContent(json)
                  setIsDirty(true)
                })
              }}
            />
          </LexicalComposer>
        ) : content && content.root ? (
          <RichText data={content} />
        ) : (
          <p className="text-muted-foreground italic">No theory content available.</p>
        )}
      </div>
    </div>
  )
}
