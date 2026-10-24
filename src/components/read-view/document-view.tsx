import type { CSSProperties, ReactNode } from 'react'
import { documentClass, editorTheme, indentSize } from '@/components/editor/theme'
import type { BoardDocument, DocNode } from '@/lib/document'

/**
 * Document ka read view — server par JSON se seedha React (browser me Lexical ka JS nahi aata).
 * Har naya node type (headings, lists, ...) yahan apna renderer jodta hai; anjaan type kuch nahi dikhata.
 */
/** List ke andar: kitni lists gehra (1 = bahar wali), is item ka number, check list ka item he ya nahi */
interface ListContext {
  depth: number
  value?: number
  check?: boolean
}

/** Indent (B8) editor jaisa: line ki andar ki padding; quote poora block (baen line samet) andar */
function indentProps(node: DocNode, base: string, as: 'padding' | 'margin' = 'padding') {
  const indent = typeof node.indent === 'number' ? node.indent : 0
  if (indent <= 0) return { className: base }
  const style: CSSProperties =
    as === 'margin'
      ? { marginInlineStart: indentSize(indent) }
      : { paddingInlineStart: indentSize(indent) }
  return { className: `${base} ${editorTheme.indent}`, style }
}

const renderers: Record<
  string,
  (node: DocNode, children: ReactNode, key: number, ctx: ListContext) => ReactNode
> = {
  paragraph: (node, children, key) => (
    <p key={key} {...indentProps(node, editorTheme.paragraph)}>
      {node.children?.length ? children : <br />}
    </p>
  ),
  heading: (node, children, key) => {
    const Tag = node.tag as keyof typeof editorTheme.heading
    return (
      <Tag key={key} {...indentProps(node, editorTheme.heading[Tag])}>
        {node.children?.length ? children : <br />}
      </Tag>
    )
  },
  quote: (node, children, key) => (
    <blockquote key={key} {...indentProps(node, editorTheme.quote, 'margin')}>
      {node.children?.length ? children : <br />}
    </blockquote>
  ),
  list: (node, children, key, { depth }) => {
    if (node.listType !== 'number') {
      return (
        <ul
          key={key}
          className={
            node.listType === 'check'
              ? `${editorTheme.list.ul} ${editorTheme.list.checklist}`
              : editorTheme.list.ul
          }
        >
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
  listitem: (node, children, key, { value, check }) => {
    // Classes Lexical ki tarteeb me: item, (check list) tick ya khali, (andar wali list rakhe) nested
    const { list } = editorTheme
    const nested = node.children?.some((c) => c.type === 'list') ?? false
    const classes = [list.listitem]
    if (check) classes.push(node.checked ? list.listitemChecked : list.listitemUnchecked)
    if (nested) classes.push(list.nested.listitem)
    // Sirf asal item checkbox he (wrapper nahi); visitor ke liye sirf dekhne ka (owner, B6)
    const box = check && node.children?.[0]?.type !== 'list'
    return (
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role sirf check item par `checkbox` he (Lexical jaisa), tab hi aria-checked
      <li
        key={key}
        value={value}
        className={classes.join(' ')}
        role={box ? 'checkbox' : undefined}
        aria-checked={box ? node.checked === true : undefined}
        aria-readonly={box ? true : undefined}
      >
        {node.children?.length ? children : <br />}
      </li>
    )
  },
  horizontalrule: (_node, _children, key) => <hr key={key} className={editorTheme.hr} />,
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
          check: node.listType === 'check',
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
