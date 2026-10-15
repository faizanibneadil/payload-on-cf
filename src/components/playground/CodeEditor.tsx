'use client'

import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useCallback, useEffect, useRef } from 'react'
import { formatCode, isFormattable } from '@/lib/format-code'
import '@/lib/monaco/loader'
import { registerAutoCloseTag } from '@/lib/monaco/auto-close-tag'
import { registerTagRenameSync } from '@/lib/monaco/tag-rename-sync'
import { applyMonacoTheme } from '@/lib/monaco/theme'

export function languageFor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'js':
    case 'mjs':
    case 'jsx':
      return 'javascript'
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    case 'svg':
    case 'xml':
      return 'xml'
    default:
      return 'plaintext'
  }
}

interface CodeEditorProps {
  /** Unique model path (e.g. "/css/app.css") — har file ka apna undo history */
  path: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  onSave?: () => void
}

export default function CodeEditor({ path, value, readOnly, onChange, onSave }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
  onChangeRef.current = onChange
  onSaveRef.current = onSave

  const language = languageFor(path)

  // formatOnType sirf html ke liye chahiye (auto-close-tag provider uska use karta hai)
  useEffect(() => {
    editorRef.current?.updateOptions({ formatOnType: language === 'html' })
  }, [language])

  const format = useCallback(async () => {
    const ed = editorRef.current
    const model = ed?.getModel()
    if (!ed || !model || readOnlyRef.current) return
    const lang = model.getLanguageId()
    if (!isFormattable(lang)) return
    try {
      const formatted = await formatCode(model.getValue(), lang)
      if (formatted === model.getValue()) return
      ed.executeEdits('prettier', [{ range: model.getFullModelRange(), text: formatted }])
    } catch {
      // Invalid syntax format nahi ho sakta — content jaisa hai waisa rehne do
    }
  }, [])

  return (
    <Editor
      height="100%"
      width="100%"
      path={path}
      language={language}
      value={value}
      theme="app"
      loading={
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Loading editor…
        </div>
      }
      onChange={(v) => onChangeRef.current(v ?? '')}
      options={{
        readOnly,
        domReadOnly: readOnly,
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: 21,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fixedOverflowWidgets: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        renderLineHighlight: 'all',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoIndent: 'full',
        matchBrackets: 'always',
        quickSuggestions: { other: true, comments: false, strings: true },
        suggestOnTriggerCharacters: true,
        folding: true,
        showFoldingControls: 'mouseover',
        linkedEditing: true,
        formatOnType: language === 'html',
        padding: { top: 8 },
      }}
      beforeMount={(monaco) => {
        applyMonacoTheme(monaco)
        // JS suggestions ke liye DOM globals (document, console, ...)
        monaco.typescript.javascriptDefaults.setCompilerOptions({
          target: monaco.typescript.ScriptTarget.ES2020,
          allowNonTsExtensions: true,
          lib: ['es2020', 'dom'],
        })
      }}
      onMount={(editorInstance, monaco) => {
        editorRef.current = editorInstance
        monacoRef.current = monaco

        // Built-in formatter ko Prettier se replace karo (Shift+Alt+F)
        editorInstance.addAction({
          id: 'editor.action.formatDocument',
          label: 'Format Document',
          keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
          run: () => {
            void format()
          },
        })
        // Ctrl/Cmd+S -> save
        editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
          onSaveRef.current?.(),
        )

        registerAutoCloseTag(monaco, editorInstance)
        registerTagRenameSync(monaco)
      }}
    />
  )
}
