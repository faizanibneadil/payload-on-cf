import type { ReactNode } from 'react'
import { documentClass, editorTheme } from '@/components/editor/theme'
import type { BoardDocument, DocNode } from '@/lib/document'

/**
 * Document ka read view — server par JSON se seedha React (browser me Lexical ka JS nahi aata).
 * Har naya node type (headings, lists, ...) yahan apna renderer jodta hai; anjaan type kuch nahi dikhata.
 */
const renderers: Record<string, (node: DocNode, children: ReactNode, key: number) => ReactNode> = {
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
  list: (_node, children, key) => (
    <ul key={key} className={editorTheme.list.ul}>
      {children}
    </ul>
  ),
  listitem: (node, children, key) => {
    // Andar wali list rakhne wala item: Lexical jaisa dono classes ("nested" = apna bullet nahi)
    const nested = node.children?.some((c) => c.type === 'list') ?? false
    return (
      <li
        key={key}
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

function renderChildren(nodes: DocNode[] | undefined): ReactNode {
  return nodes?.map((node, i) => {
    const render = renderers[node.type]
    return render ? render(node, renderChildren(node.children), i) : null
  })
}

export function DocumentView({ doc }: { doc: BoardDocument }) {
  return (
    <div className={documentClass} data-testid="document-view">
      {renderChildren(doc.root.children)}
    </div>
  )
}
