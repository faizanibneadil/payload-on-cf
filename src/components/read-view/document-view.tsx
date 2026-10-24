import type { ReactNode } from 'react'
import { documentClass, editorTheme } from '@/components/editor/theme'
import type { BoardDocument, DocNode } from '@/lib/document'

/**
 * Document ka read view — server par JSON se seedha React (browser me Lexical ka JS nahi aata).
 * Har naya node type (headings, lists, ...) yahan apna renderer jodta hai; anjaan type kuch nahi dikhata.
 */
/** List ke andar: kitni lists gehra (1 = bahar wali) aur is item ka number — Lexical jaisa */
interface ListContext {
  depth: number
  value?: number
}

const renderers: Record<
  string,
  (node: DocNode, children: ReactNode, key: number, ctx: ListContext) => ReactNode
> = {
  paragraph: (node, children, key) => (
    <p key={key} className={editorTheme.paragraph}>
      {node.children?.length ? children : <br />}
    </p>
  ),
  heading: (node, children, key) => {
    const Tag = node.tag as keyof typeof editorTheme.heading
    return (
      <Tag key={key} className={editorTheme.heading[Tag]}>
        {node.children?.length ? children : <br />}
      </Tag>
    )
  },
  quote: (node, children, key) => (
    <blockquote key={key} className={editorTheme.quote}>
      {node.children?.length ? children : <br />}
    </blockquote>
  ),
  list: (node, children, key, { depth }) => {
    if (node.listType !== 'number') {
      return (
        <ul key={key} className={editorTheme.list.ul}>
          {children}
        </ul>
      )
    }
    // Har level ka number style (1. → A. → a. → I. → i.), phir dobara shuru
    const { olDepth } = editorTheme.list
    const start = typeof node.start === 'number' ? node.start : 1
    return (
      <ol
        key={key}
        start={start === 1 ? undefined : start}
        className={`${editorTheme.list.ol} ${olDepth[(depth - 1) % olDepth.length]}`}
      >
        {children}
      </ol>
    )
  },
  listitem: (node, children, key, { value }) => {
    // Andar wali list rakhne wala item: Lexical jaisa dono classes ("nested" = apna bullet nahi)
    const nested = node.children?.some((c) => c.type === 'list') ?? false
    return (
      <li
        key={key}
        value={value}
        className={
          nested
            ? `${editorTheme.list.listitem} ${editorTheme.list.nested.listitem}`
            : editorTheme.list.listitem
        }
      >
        {node.children?.length ? children : <br />}
      </li>
    )
  },
  text: (node, _children, key) => <span key={key}>{node.text as string}</span>,
  linebreak: (_node, _children, key) => <br key={key} />,
  tab: (_node, _children, key) => <span key={key}>{'\t'}</span>,
}

function renderChildren(nodes: DocNode[] | undefined, depth = 0): ReactNode {
  return nodes?.map((node, i) => {
    const render = renderers[node.type]
    if (!render) return null
    // List ke items ko number Lexical ki tarah: start se, andar wali list rakhne wala item number nahi leta
    if (node.type === 'list') {
      let value = typeof node.start === 'number' ? node.start : 1
      const items = node.children?.map((item, j) => {
        const itemValue = value
        if (item.children?.[0]?.type !== 'list') value++
        const renderItem = renderers[item.type]
        return renderItem?.(item, renderChildren(item.children, depth + 1), j, {
          depth: depth + 1,
          value: itemValue,
        })
      })
      return render(node, items, i, { depth: depth + 1 })
    }
    return render(node, renderChildren(node.children, depth), i, { depth })
  })
}

export function DocumentView({ doc }: { doc: BoardDocument }) {
  return (
    <div className={documentClass} data-testid="document-view">
      {renderChildren(doc.root.children)}
    </div>
  )
}
