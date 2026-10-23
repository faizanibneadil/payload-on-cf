'use client'

import { $createListNode, $isListItemNode, $isListNode, type ListItemNode } from '@lexical/list'
import type { ElementTransformer } from '@lexical/markdown'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type TextNode,
} from 'lexical'
import { useEffect } from 'react'
import { TRANSFORMERS } from './config'

const ELEMENT_TRANSFORMERS = TRANSFORMERS.filter(
  (t): t is ElementTransformer => t.type === 'element',
)

/**
 * Lexical ke markdown shortcuts sirf top-level lines par chalte hain. Purana editor list item par
 * bhi chalta tha (e.g. list ki line par "## " = heading), is liye: list item ke shuru me shortcut +
 * space likhte hi item list se nikal kar woh block ban jata hai.
 */
export function ListShortcutsPlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState, tags, dirtyLeaves }) => {
        if (tags.has('historic') || dirtyLeaves.size === 0 || editor.isComposing()) return
        const hit = editorState.read(() => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null
          const node = selection.anchor.getNode()
          const item = node.getParent()
          if (!$isTextNode(node) || !$isListItemNode(item) || item.getFirstChild() !== node)
            return null
          if (item.getChildren().some((child) => $isListNode(child))) return null
          const offset = selection.anchor.offset
          const text = node.getTextContent()
          if (text[offset - 1] !== ' ') return null
          for (const transformer of ELEMENT_TRANSFORMERS) {
            const match = text.match(transformer.regExp)
            if (match && match[0].length === offset)
              return { key: node.getKey(), transformer, match }
          }
          return null
        })
        if (!hit) return
        editor.update(() => {
          const node = $getNodeByKey(hit.key)
          const item = node?.getParent()
          if (!$isTextNode(node) || !$isListItemNode(item)) return
          liftAndApply(item, node, hit.transformer, hit.match)
        })
      }),
    [editor],
  )
  return null
}

function liftAndApply(
  item: ListItemNode,
  textNode: TextNode,
  transformer: ElementTransformer,
  match: RegExpMatchArray,
) {
  const list = item.getParent()
  if (!$isListNode(list)) return
  // Shortcut wala hissa hatao
  const rest = textNode.getTextContent().slice(match[0].length)
  if (rest) textNode.setTextContent(rest)
  else textNode.remove()

  // Item ko list se nikal kar paragraph banao; baad wale items nayi list me
  const paragraph = $createParagraphNode()
  paragraph.append(...item.getChildren())
  const after = item.getNextSiblings()
  list.insertAfter(paragraph)
  if (after.length) {
    const tail = $createListNode(list.getListType())
    tail.append(...after)
    paragraph.insertAfter(tail)
  }
  item.remove()
  if (list.getChildrenSize() === 0) list.remove()

  // Ab wahi transformer jo top-level line par lagta (heading, list, to-do); caret naye block ke shuru me
  paragraph.selectStart()
  transformer.replace(paragraph, paragraph.getChildren(), match, false)
  if (textNode.isAttached()) textNode.select(0, 0)
}
