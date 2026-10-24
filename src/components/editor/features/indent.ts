import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { $isQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { mergeRegister } from '@lexical/utils'
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  type ElementNode,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type Klass,
  OUTDENT_CONTENT_COMMAND,
  ParagraphNode,
} from 'lexical'
import { createElement, useEffect } from 'react'
import { MAX_INDENT } from '@/lib/document'
import { indentSize } from '../theme'
import type { EditorFeature } from './types'

// Jin lines ka indent hota he (owner, B8); list items ka indent = nesting (`list-tab.ts`)
const INDENT_NODES: Klass<ElementNode>[] = [ParagraphNode, HeadingNode, QuoteNode]

/**
 * Lexical ka Tab plugin (Payload ka default): line ke shuru me Tab (ya kai lines chuni hon) = poori line
 * andar, text ke beech Tab = tab ka faasla, Shift+Tab = bahar. Hadd `MAX_INDENT` (Lexical ki shart
 * `naya indent < maxIndent` he, isliye +1); yahi hadd list ki nesting par bhi lagti he.
 */
function TabIndent() {
  return createElement(TabIndentationPlugin, { maxIndent: MAX_INDENT + 1 })
}

/**
 * Shift+Tab hamesha line bahar (owner: "Shift+Tab = bahar"); Lexical text ke beech Shift+Tab par bhi
 * tab daal deta. Hadd se zyada indent (paste ya purana data) hadd par. Quote ka indent poore block ko
 * (baen line samet) andar le jata he — Lexical sirf andar ki padding badalta, jo quote ki apni padding
 * ki jagah le leti.
 */
function IndentPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          KEY_TAB_COMMAND,
          (event) => {
            if (!event.shiftKey || !$isRangeSelection($getSelection())) return false
            event.preventDefault()
            return editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
          },
          COMMAND_PRIORITY_LOW,
        ),
        ...INDENT_NODES.map((klass) =>
          editor.registerNodeTransform(klass, (node) => {
            if (node.getIndent() > MAX_INDENT) node.setIndent(MAX_INDENT)
          }),
        ),
        editor.registerMutationListener(QuoteNode, (mutations) => {
          editor.getEditorState().read(() => {
            for (const [key, mutation] of mutations) {
              if (mutation === 'destroyed') continue
              const node = $getNodeByKey(key)
              const dom = editor.getElementByKey(key)
              if (!$isQuoteNode(node) || !dom) continue
              const indent = node.getIndent()
              dom.style.removeProperty('padding-inline-start')
              if (indent > 0) dom.style.marginInlineStart = indentSize(indent)
              else dom.style.removeProperty('margin-inline-start')
              if (!dom.getAttribute('style')) dom.removeAttribute('style')
            }
          })
        }),
      ),
    [editor],
  )
  return null
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])

/**
 * Keyboard se editor se bahar (owner: Escape phir Tab, Payload jaisa). Escape par Lexical editor se focus
 * hata deta he; agla Tab / Shift+Tab browser khud aage/peechay le jata he — us ek pal ke liye editor ko
 * `tabindex=-1` taa ke Shift+Tab (caret editor ke andar se) dobara editor par na aaye. Koi aur key, click
 * ya focus = intezar khatam.
 */
function EscapeTabPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    let disarm: (() => void) | null = null
    const unregister = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        disarm?.()
        const root = editor.getRootElement()
        if (!root) return false
        const onKey = (event: KeyboardEvent) => {
          // Shift+Tab me pehle akela Shift aata he — us par intezar khatam nahi
          if (MODIFIER_KEYS.has(event.key)) return
          // Sirf jab Escape ne waqai focus hataya ho (slash menu / check list ka Escape focus nahi hatata)
          const left = !root.contains(document.activeElement)
          if (event.key === 'Tab' && left) {
            const before = root.getAttribute('tabindex')
            root.setAttribute('tabindex', '-1')
            // Browser focus aage le ja chuka ho, phir pehle jaisa
            setTimeout(() => {
              if (before === null) root.removeAttribute('tabindex')
              else root.setAttribute('tabindex', before)
            })
          }
          disarm?.()
        }
        const cancel = () => disarm?.()
        document.addEventListener('keydown', onKey, true)
        document.addEventListener('pointerdown', cancel, true)
        root.addEventListener('focus', cancel)
        disarm = () => {
          document.removeEventListener('keydown', onKey, true)
          document.removeEventListener('pointerdown', cancel, true)
          root.removeEventListener('focus', cancel)
          disarm = null
        }
        // Escape Lexical ke paas hi rahe (wahi focus hatata he)
        return false
      },
      // Lexical ke apne Escape (EDITOR) se pehle; false lautata he, to wo bhi chalta he
      COMMAND_PRIORITY_LOW,
    )
    return () => {
      disarm?.()
      unregister()
    }
  }, [editor])
  return null
}

/**
 * Indent — Payload ka IndentFeature: paragraph, heading aur quote Tab / Shift+Tab se andar/bahar
 * (24px fi level, 15 level tak). Escape editor se focus hata deta he (Lexical), phir Tab agle button par.
 */
export const indentFeature: EditorFeature = {
  key: 'indent',
  plugins: [TabIndent, IndentPlugin, EscapeTabPlugin],
}
