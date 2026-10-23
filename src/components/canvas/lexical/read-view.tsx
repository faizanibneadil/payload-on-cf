'use client'

import type { SerializedLexicalNode } from 'lexical'
import { memo, type ReactNode, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { markdownToState, THEME } from './config'

/**
 * Block ka read view: saved markdown -> Lexical JSON -> React elements.
 * Lexical editor mount nahi hota (sirf edit wale block me hota hai), aur koi raw HTML nahi banta:
 * sab text React ke text nodes hain. Classes editor jaisi hain, is liye edit mode me jaane par
 * kuch nahi hilta.
 */
export const ReadView = memo(function ReadView({ markdown }: { markdown: string }) {
  const children = useMemo(() => markdownToState(markdown).root.children, [markdown])
  return <div className="md-lines">{renderChildren(children, false)}</div>
})

// Lexical TextNode format bitmask
const FORMAT = { bold: 1, italic: 2, strikethrough: 4, code: 16 } as const

type AnyNode = SerializedLexicalNode & {
  children?: AnyNode[]
  tag?: string
  listType?: 'bullet' | 'number' | 'check'
  start?: number
  checked?: boolean
  value?: number
  text?: string
  format?: number | string
}

function renderChildren(nodes: AnyNode[] = [], inCheckList: boolean): ReactNode[] {
  // Nodes ki apni id nahi; poora block ek saath render hota hai
  return nodes.map((node, i) => renderNode(node, i, inCheckList))
}

function renderNode(node: AnyNode, key: number, inCheckList: boolean): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return (
        <p key={key} className={THEME.paragraph}>
          {node.children?.length ? renderChildren(node.children, false) : <br />}
        </p>
      )
    case 'heading': {
      const tag = (node.tag ?? 'h1') as keyof typeof THEME.heading
      const Tag = tag
      return (
        <Tag key={key} className={THEME.heading[tag]}>
          {node.children?.length ? renderChildren(node.children, false) : <br />}
        </Tag>
      )
    }
    case 'list': {
      const ordered = node.listType === 'number'
      const check = node.listType === 'check'
      const className = cn(ordered ? THEME.list.ol : THEME.list.ul, check && THEME.list.checklist)
      return ordered ? (
        <ol key={key} className={className} start={node.start !== 1 ? node.start : undefined}>
          {renderChildren(node.children, false)}
        </ol>
      ) : (
        <ul key={key} className={className}>
          {renderChildren(node.children, check)}
        </ul>
      )
    }
    case 'listitem': {
      const nested = node.children?.some((child) => child.type === 'list') ?? false
      const isCheckbox = inCheckList && !nested
      return (
        // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role sirf to-do item par lagta hai, tab aria-checked sahi hai
        <li
          key={key}
          value={node.value}
          role={isCheckbox ? 'checkbox' : undefined}
          aria-checked={isCheckbox ? Boolean(node.checked) : undefined}
          className={cn(
            THEME.list.listitem,
            inCheckList &&
              (node.checked ? THEME.list.listitemChecked : THEME.list.listitemUnchecked),
            nested && THEME.list.nested.listitem,
          )}
        >
          {node.children?.length ? renderChildren(node.children, inCheckList) : <br />}
        </li>
      )
    }
    case 'text': {
      const format = typeof node.format === 'number' ? node.format : 0
      return (
        <span
          key={key}
          className={cn(
            format & FORMAT.bold && THEME.text.bold,
            format & FORMAT.italic && THEME.text.italic,
            format & FORMAT.strikethrough && THEME.text.strikethrough,
            format & FORMAT.code && THEME.text.code,
          )}
        >
          {node.text}
        </span>
      )
    }
    case 'linebreak':
      return <br key={key} />
    case 'tab':
      return <span key={key}>{'\t'}</span>
    default:
      // Na pehchani cheez: kam se kam text dikha do
      return node.children ? <span key={key}>{renderChildren(node.children, false)}</span> : null
  }
}
