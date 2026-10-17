'use client'

import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { CodeBlockWithCopy } from '@/lib/tiptap/code-block-with-copy'
import { lowlight } from '@/lib/tiptap/lowlight-instance'
import { SmartCodeIndent } from '@/lib/tiptap/smart-code-indent'
import { PanelHeader } from './PanelWorkspace'
import { BubbleToolbar } from './theory/bubble-toolbar'
import { SlashMenu } from './theory/slash-menu'

// Module-level taake extension instances ka identity stable rahe
const EXTENSIONS = [
  StarterKit.configure({
    codeBlock: false,
    // StarterKit v3 me Link + Underline already hain. Links hamesha naye tab me kholte hain.
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
    },
  }),
  CodeBlockWithCopy.configure({ lowlight, enableTabIndentation: true, tabSize: 2 }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  SmartCodeIndent,
  Placeholder.configure({
    placeholder:
      'Write your lesson notes here — select text to format it, or type "/" to insert a list, code block, table or divider…',
  }),
]

interface TheoryEditorProps {
  /** Tiptap JSON ya (purane import ke liye) HTML string */
  content: unknown
  editable: boolean
  onChange?: (json: Record<string, unknown>) => void
}

export default function TheoryEditor({ content, editable, onChange }: TheoryEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: EXTENSIONS,
    content: (content ?? undefined) as string | Record<string, unknown> | undefined,
    onUpdate: ({ editor: instance }) => {
      onChange?.(instance.getJSON() as Record<string, unknown>)
    },
    editorProps: {
      attributes: { class: 'tiptap typeset max-w-[44em] focus:outline-none' },
    },
  })

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  return (
    <div className="flex h-full min-h-0 flex-col bg-editor">
      <PanelHeader id="theory" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[44em] flex-col px-5 py-6 sm:px-8">
          <EditorContent editor={editor} className="flex flex-1 flex-col" />
        </div>
      </div>
      {editable && editor && (
        <>
          <BubbleToolbar editor={editor} />
          <SlashMenu editor={editor} />
        </>
      )}
    </div>
  )
}
