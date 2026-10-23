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
