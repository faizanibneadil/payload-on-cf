'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'

interface TheoryEditorProps {
  content?: any
  isReadOnly?: boolean
  onChange?: (jsonContent: any) => void
}

export default function TheoryEditor({ content, isReadOnly = false, onChange }: TheoryEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content:
      content || '<h2>Theory / Lesson Notes</h2><p>Write or view your theory material here...</p>',
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON())
      }
    },
  })

  React.useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly)
    }
  }, [isReadOnly, editor])

  if (!editor) {
    return <div className="p-4 text-sm text-muted-foreground">Loading Theory Editor...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Theory & Lecture Notes
        </span>
        {isReadOnly && (
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
            Read Only
          </span>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b px-3 py-1.5 bg-background">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('bold') ? 'bg-accent text-accent-foreground font-bold' : ''
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('italic') ? 'bg-accent text-accent-foreground italic' : ''
            }`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-accent text-accent-foreground font-bold'
                : ''
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('codeBlock') ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            Code
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none dark:prose-invert">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
