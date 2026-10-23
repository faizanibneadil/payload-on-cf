'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
} from 'lexical'
import { Bold, Code, Italic, Strikethrough } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// Sirf woh formatting jo markdown me save hoti hai
const BUTTONS: { format: TextFormatType; label: string; icon: typeof Bold }[] = [
  { format: 'bold', label: 'Bold (Ctrl+B)', icon: Bold },
  { format: 'italic', label: 'Italic (Ctrl+I)', icon: Italic },
  { format: 'strikethrough', label: 'Strikethrough', icon: Strikethrough },
  { format: 'code', label: 'Inline code', icon: Code },
]

type State = { top: number; left: number; active: Set<TextFormatType> } | null

/**
 * Text select karne par chhota toolbar selection ke upar. Body me portal + fixed position, is liye
 * canvas ka zoom isay chhota/bara nahi karta.
 */
export function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState<State>(null)

  const refresh = useCallback(() => {
    const selection = $getSelection()
    const native = window.getSelection()
    const root = editor.getRootElement()
    if (
      !$isRangeSelection(selection) ||
      selection.isCollapsed() ||
      !native ||
      native.rangeCount === 0 ||
      !root?.contains(native.anchorNode)
    ) {
      setState(null)
      return
    }
    const rect = native.getRangeAt(0).getBoundingClientRect()
    const active = new Set(BUTTONS.map((b) => b.format).filter((f) => selection.hasFormat(f)))
    setState({ top: rect.top, left: rect.left + rect.width / 2, active })
  }, [editor])

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(refresh)),
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            refresh()
            return false
          },
          COMMAND_PRIORITY_LOW,
        ),
      ),
    [editor, refresh],
  )

  if (!state) return null
  return createPortal(
    <div
      role="toolbar"
      aria-label="Text formatting"
      data-testid="inline-toolbar"
      className="fixed z-50 flex -translate-x-1/2 -translate-y-full gap-0.5 rounded-md border bg-popover p-0.5 shadow-md"
      style={{ top: state.top - 8, left: state.left }}
      // Portal ke events React tree me canvas tak jate hain: canvas isay khali jagah ka click na samjhe
      onPointerDown={(event) => event.stopPropagation()}
      // Button dabane se editor ka selection na jaye
      onMouseDown={(event) => event.preventDefault()}
    >
      {BUTTONS.map(({ format, label, icon: Icon }) => (
        <button
          key={format}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={state.active.has(format)}
          data-testid={`format-${format}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
          className={cn(
            'flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4',
            state.active.has(format) && 'bg-muted text-foreground',
          )}
        >
          <Icon />
        </button>
      ))}
    </div>,
    document.body,
  )
}
