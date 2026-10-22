'use client'

import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import {
  type Line,
  type LineType,
  parseMarkdown,
  serializeMarkdown,
  shortcutFor,
} from '@/lib/scene'

/**
 * Live markdown block editor. DOM khud manage karta hai (React andar render nahi karta, warna caret
 * kood jata hai): har line ek `<div data-type>` hai. Line ke shuru me `# `, `- `, `1. ` likhte hi
 * type badal jata hai; Enter list jari rakhta hai; khali list item par Enter list khatam karta hai.
 */
export const TextEditor = memo(function TextEditor({
  initialMarkdown,
  onChange,
  onExit,
}: {
  initialMarkdown: string
  onChange: (markdown: string) => void
  onExit: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onChange, onExit })
  callbacks.current = { onChange, onExit }

  // Pehli dafa DOM banao aur caret aakhir me rakho (initialMarkdown sirf mount par chahiye)
  // biome-ignore lint/correctness/useExhaustiveDependencies: sirf mount par chalna hai
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.replaceChildren(...parseMarkdown(initialMarkdown).map(createLine))
    root.focus({ preventScroll: true })
    const last = root.lastElementChild as HTMLElement
    placeCaret(last, lineText(last).length)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const emit = () => callbacks.current.onChange(serializeMarkdown(readLines(root)))

    const onBeforeInput = (event: InputEvent) => {
      const type = event.inputType
      // Bold/italic jaisi formatting abhi nahi — sirf block markdown
      if (type.startsWith('format')) {
        event.preventDefault()
        return
      }
      const ctx = caretContext(root)

      if (type === 'insertFromPaste' || type === 'insertFromDrop') {
        event.preventDefault()
        const text = event.dataTransfer?.getData('text/plain') ?? ''
        if (text) insertText(root, text)
        emit()
        return
      }
      if (!ctx) return

      if (type === 'insertText' && event.data === ' ' && ctx.collapsed) {
        const before = lineText(ctx.line).slice(0, ctx.offset)
        const next = shortcutFor(before)
        // Kisi bhi line par (list item par bhi) shortcut type badal deta hai
        if (next) {
          event.preventDefault()
          setLine(ctx.line, next, lineText(ctx.line).slice(ctx.offset))
          placeCaret(ctx.line, 0)
          emit()
        }
        return
      }

      if ((type === 'insertParagraph' || type === 'insertLineBreak') && ctx.collapsed) {
        event.preventDefault()
        const text = lineText(ctx.line)
        const lineType = ctx.line.dataset.type as LineType
        const isList = lineType === 'ul' || lineType === 'ol'
        if (isList && text === '') {
          // Khali list item par Enter = list khatam
          setLine(ctx.line, 'p', '')
          placeCaret(ctx.line, 0)
        } else {
          setLine(ctx.line, lineType, text.slice(0, ctx.offset))
          const next = createLine({ type: isList ? lineType : 'p', text: text.slice(ctx.offset) })
          insertAfter(ctx.line, next)
          placeCaret(next, 0)
        }
        emit()
        return
      }

      if (type === 'deleteContentBackward' && ctx.collapsed && ctx.offset === 0) {
        event.preventDefault()
        if (ctx.line.dataset.type !== 'p') {
          // Formatted line ke shuru me Backspace = wapas paragraph
          setLine(ctx.line, 'p', lineText(ctx.line))
          placeCaret(ctx.line, 0)
        } else {
          const prev = ctx.line.previousElementSibling as HTMLElement | null
          if (prev) {
            const prevText = lineText(prev)
            setLine(prev, prev.dataset.type as LineType, prevText + lineText(ctx.line))
            ctx.line.remove()
            placeCaret(prev, prevText.length)
          }
        }
        emit()
        return
      }

      if (
        type === 'deleteContentForward' &&
        ctx.collapsed &&
        ctx.offset === lineText(ctx.line).length
      ) {
        const next = ctx.line.nextElementSibling as HTMLElement | null
        event.preventDefault()
        if (next) {
          const text = lineText(ctx.line)
          setLine(ctx.line, ctx.line.dataset.type as LineType, text + lineText(next))
          next.remove()
          placeCaret(ctx.line, text.length)
          emit()
        }
      }
    }

    // Browser ke apne edits (typing, selection delete) ke baad structure theek karo
    const onInput = () => {
      normalize(root)
      emit()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        callbacks.current.onExit()
      }
      // Canvas ke shortcuts (Delete, V/H/T, undo) editing ke dauraan na chalein
      event.stopPropagation()
    }

    root.addEventListener('beforeinput', onBeforeInput)
    root.addEventListener('input', onInput)
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('beforeinput', onBeforeInput)
      root.removeEventListener('input', onInput)
      root.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      role="textbox"
      aria-multiline="true"
      aria-label="Text block"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      className="md-lines cursor-text outline-none"
      data-testid="text-editor"
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
})

// ---------- DOM helpers ----------

// `Element.after` ko Cloudflare ke global types HTMLRewriter wale signature se badal dete hain
function insertAfter(ref: HTMLElement, el: HTMLElement) {
  ref.parentNode?.insertBefore(el, ref.nextSibling)
}

function createLine(line: Line): HTMLElement {
  const el = document.createElement('div')
  setLine(el, line.type, line.text)
  return el
}

function setLine(el: HTMLElement, type: LineType, text: string) {
  el.dataset.type = type
  el.textContent = text
  // Khali line par caret rakhne ke liye <br>
  if (!text) el.appendChild(document.createElement('br'))
}

function lineText(el: HTMLElement) {
  return (el.textContent ?? '').replace(/​/g, '').replace(/\n/g, '')
}

function readLines(root: HTMLElement): Line[] {
  return Array.from(root.children).map((el) => ({
    type: ((el as HTMLElement).dataset.type as LineType) ?? 'p',
    text: lineText(el as HTMLElement),
  }))
}

function placeCaret(el: HTMLElement, offset: number) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  const textNode = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE)
  if (textNode) range.setStart(textNode, Math.min(offset, textNode.textContent?.length ?? 0))
  else range.setStart(el, 0)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function lineOf(root: HTMLElement, node: Node | null): HTMLElement | null {
  let current: Node | null = node
  while (current && current.parentNode !== root) current = current.parentNode
  return current instanceof HTMLElement ? current : null
}

function caretContext(root: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  const line = lineOf(root, range.startContainer)
  if (!line) return null
  const pre = document.createRange()
  pre.selectNodeContents(line)
  pre.setEnd(range.startContainer, range.startOffset)
  return { line, offset: pre.toString().length, collapsed: range.collapsed }
}

/** Har child ek `div[data-type]` ho; browser ke banaye extra nodes theek karo */
function normalize(root: HTMLElement) {
  for (const node of Array.from(root.childNodes)) {
    if (node instanceof HTMLElement && node.tagName === 'DIV') {
      if (!node.dataset.type) node.dataset.type = 'p'
      // Line ke andar sirf text (browser span/b daal de to plain text bana do)
      if (
        node.children.length &&
        !(node.children.length === 1 && node.firstElementChild?.tagName === 'BR')
      ) {
        const sel = caretContext(root)
        const keep = sel?.line === node ? sel.offset : null
        setLine(node, node.dataset.type as LineType, lineText(node))
        if (keep !== null) placeCaret(node, keep)
      }
      continue
    }
    // Root par seedha text ya <br> — usse paragraph me lapeto
    const text = node.textContent ?? ''
    if (node.nodeType === Node.TEXT_NODE && text) {
      const line = createLine({ type: 'p', text })
      node.replaceWith(line)
      placeCaret(line, text.length)
    } else {
      node.remove()
    }
  }
  if (!root.firstChild) {
    const line = createLine({ type: 'p', text: '' })
    root.appendChild(line)
    placeCaret(line, 0)
  }
}

/** Paste: plain text, aur har line ka markdown bhi lagu (e.g. "# Title") */
function insertText(root: HTMLElement, text: string) {
  const selection = window.getSelection()
  if (selection && !selection.isCollapsed) selection.deleteFromDocument()
  normalize(root)
  const ctx = caretContext(root)
  if (!ctx) return
  const current = lineText(ctx.line)
  const before = current.slice(0, ctx.offset)
  const after = current.slice(ctx.offset)
  const pasted = parseMarkdown(text.replace(/\r\n?/g, '\n'))
  // Line ke shuru me paste ho to pehli pasted line ka type (e.g. "## ") bhi lagao
  const firstType =
    before === '' && pasted[0].type !== 'p' ? pasted[0].type : (ctx.line.dataset.type as LineType)
  if (pasted.length === 1) {
    setLine(ctx.line, firstType, before + pasted[0].text + after)
    placeCaret(ctx.line, before.length + pasted[0].text.length)
    return
  }
  setLine(ctx.line, firstType, before + pasted[0].text)
  let last: HTMLElement = ctx.line
  for (const line of pasted.slice(1)) {
    const el = createLine(line)
    insertAfter(last, el)
    last = el
  }
  const lastText = lineText(last)
  setLine(last, last.dataset.type as LineType, lastText + after)
  placeCaret(last, lastText.length)
}
