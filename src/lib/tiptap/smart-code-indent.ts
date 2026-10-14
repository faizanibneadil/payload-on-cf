import { Extension } from '@tiptap/core'

const VOID_ELEMENTS = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i

function opensABlock(trimmedLine: string): boolean {
  if (/[{[(]\s*$/.test(trimmedLine)) return true
  // An opening HTML tag like `<div class="foo">` — not self-closing, and
  // not a void element like `<br>` or `<img ... />`.
  if (VOID_ELEMENTS.test(trimmedLine) || /\/>\s*$/.test(trimmedLine)) return false
  return /<[a-zA-Z][^>]*>$/.test(trimmedLine)
}

/**
 * Gives Tiptap's code blocks VS Code-style "smart" indentation on Enter:
 * the new line starts with the same leading whitespace as the line you
 * just left, plus one extra indent level if that line opened a block
 * (an unclosed `{`, `[`, `(`, or HTML tag). Without this, Tiptap's stock
 * CodeBlock only inserts a bare newline — every line of indentation has
 * to be typed by hand.
 */
export const SmartCodeIndent = Extension.create({
  name: 'smartCodeIndent',

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor
        const { selection } = state
        const { $from, empty } = selection
        if (!empty || $from.parent.type.name !== 'codeBlock') return false

        const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, '\n', '\n')
        const currentLine = textBeforeCursor.split('\n').pop() ?? ''
        const currentIndent = currentLine.match(/^[ \t]*/)?.[0] ?? ''
        const trimmedLine = currentLine.trim()

        const nextIndent = currentIndent + (opensABlock(trimmedLine) ? '  ' : '')

        return this.editor.commands.insertContent(`\n${nextIndent}`)
      },
    }
  },
})
