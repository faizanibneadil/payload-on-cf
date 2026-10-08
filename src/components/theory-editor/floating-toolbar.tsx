'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical'
import { $createHeadingNode, HeadingNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { Bold, Italic, Code, Underline, Strikethrough, Heading1, Heading2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FloatingToolbar() {
  const [editor] = useLexicalComposerContext()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsCode(selection.hasFormat('code'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))

      const nativeSelection = window.getSelection()
      if (nativeSelection && nativeSelection.rangeCount > 0) {
        const range = nativeSelection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setPosition({
          top: rect.top - 48 + window.scrollY,
          left: rect.left + rect.width / 2 + window.scrollX,
        })
        setIsVisible(true)
        return
      }
    }
    setIsVisible(false)
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, updateToolbar])

  if (!isVisible) return null

  return (
    <div
      ref={toolbarRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
      className="absolute z-50 flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in zoom-in-95"
    >
      <Button
        variant={isBold ? 'default' : 'ghost'}
        size="icon-xs"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Bold"
      >
        <Bold className="size-3.5" />
      </Button>
      <Button
        variant={isItalic ? 'default' : 'ghost'}
        size="icon-xs"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Italic"
      >
        <Italic className="size-3.5" />
      </Button>
      <Button
        variant={isUnderline ? 'default' : 'ghost'}
        size="icon-xs"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Underline"
      >
        <Underline className="size-3.5" />
      </Button>
      <Button
        variant={isStrikethrough ? 'default' : 'ghost'}
        size="icon-xs"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        title="Strikethrough"
      >
        <Strikethrough className="size-3.5" />
      </Button>
      <Button
        variant={isCode ? 'default' : 'ghost'}
        size="icon-xs"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        title="Inline Code"
      >
        <Code className="size-3.5" />
      </Button>
      <div className="h-4 w-px bg-border my-auto" />
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createHeadingNode('h1'))
            }
          })
        }}
        title="Heading 1"
      >
        <Heading1 className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createHeadingNode('h2'))
            }
          })
        }}
        title="Heading 2"
      >
        <Heading2 className="size-3.5" />
      </Button>
    </div>
  )
}
