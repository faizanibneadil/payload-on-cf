import type { Monaco } from '@monaco-editor/react'
import type { editor, languages, Position } from 'monaco-editor'

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

let disposable: { dispose: () => void } | null = null

/**
 * Opening tag ka ">" type karte hi matching "</tag>" insert hota hai (void/self-closing skip).
 * Monaco on-type formatting use karta hai (editor option `formatOnType` html files par on hona chahiye).
 */
export function registerAutoCloseTag(monaco: Monaco, editorInstance: editor.IStandaloneCodeEditor) {
  disposable?.dispose()
  disposable = monaco.languages.registerOnTypeFormattingEditProvider('html', {
    autoFormatTriggerCharacters: ['>'],
    provideOnTypeFormattingEdits(
      model: editor.ITextModel,
      position: Position,
    ): languages.TextEdit[] {
      const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
      if (before.endsWith('/')) return []

      const match = before.match(/<([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?$/)
      if (!match) return []
      const tagName = match[1]
      if (VOID_TAGS.has(tagName.toLowerCase())) return []

      // Edit ke baad Monaco cursor end par le jata hai — wapas tags ke beech rakho
      setTimeout(() => editorInstance.setPosition(position), 0)

      return [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: `</${tagName}>`,
        },
      ]
    },
  })
  return disposable
}
