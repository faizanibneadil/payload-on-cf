// Board ka document model (Lexical JSON) — server (validation) aur client (editor, read view) dono yahi use karte hain

/** Ek node ki saved shape (Lexical `exportJSON`) — baqi fields har node type apne rakhta hai */
export interface DocNode {
  type: string
  version?: number
  children?: DocNode[]
  [key: string]: unknown
}

export interface BoardDocument {
  root: DocNode
}

// Hadd: bahut gehra ya bahut bara JSON server ka CPU (free plan, 10 ms) na khaye
export const MAX_DEPTH = 32
// List ki nesting (Tab) ki hadd: root > list > listitem > text, har andar wali level +2 (list, listitem)
export const MAX_LIST_INDENT = Math.floor((MAX_DEPTH - 3) / 2)
export const MAX_NODES = 100_000
export const MAX_TEXT_CHARS = 100_000

/**
 * Kaun se node types document me aa sakte hain. Har naya feature (headings, lists, ...) apna type
 * yahan jodta hai; anjaan type server par reject hota hai.
 */
const NODE_RULES: Record<string, { children: boolean; check?: (node: DocNode) => string | null }> =
  {
    root: { children: true },
    paragraph: { children: true },
    quote: { children: true },
    list: {
      children: true,
      check: (node) => {
        if (!LIST_TYPES.has(node.listType as string)) return 'Invalid list type'
        if (
          node.start !== undefined &&
          !(
            Number.isInteger(node.start) &&
            (node.start as number) >= LIST_START_MIN &&
            (node.start as number) <= LIST_START_MAX
          )
        ) {
          return 'Invalid list start'
        }
        if (!node.children?.every((c) => c?.type === 'listitem')) return 'Invalid list'
        return null
      },
    },
    listitem: {
      children: true,
      check: (node) =>
        (node.checked !== undefined && typeof node.checked !== 'boolean') ||
        (node.value !== undefined && !Number.isInteger(node.value))
          ? 'Invalid list item'
          : null,
    },
    heading: {
      children: true,
      check: (node) => (HEADING_TAGS.has(node.tag as string) ? null : 'Invalid heading level'),
    },
    text: {
      children: false,
      check: (node) => {
        if (typeof node.text !== 'string') return 'Invalid text'
        if (node.text.length > MAX_TEXT_CHARS) {
          return `A piece of text can have at most ${MAX_TEXT_CHARS} characters`
        }
        if (node.format !== undefined && !isSmallInt(node.format)) return 'Invalid text format'
        if (node.style !== undefined && typeof node.style !== 'string') return 'Invalid text style'
        return null
      },
    },
    linebreak: { children: false },
    tab: { children: false },
  }

const LIST_TYPES = new Set(['bullet', 'number', 'check'])
// Numbered list ka shuru number (owner, B5: likha hua number; hadd 1-9999)
export const LIST_START_MIN = 1
export const LIST_START_MAX = 9999
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const isSmallInt = (v: unknown) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 2 ** 16

export const emptyDocument = (): BoardDocument => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: [],
      },
    ],
  },
})

/** Board ke data me se document; purana / khali / toota data hamesha khali document banta hai */
export function readDocument(data: unknown): BoardDocument {
  const doc = (data as { doc?: unknown } | null)?.doc
  if (validateDocument({ doc }) !== true || !doc) return emptyDocument()
  return doc as BoardDocument
}

/** Document me koi likhai hai? (visitor ke liye "khali board" ka message) */
export function hasContent(doc: BoardDocument): boolean {
  const walk = (node: DocNode): boolean =>
    node.type !== 'root' && node.type !== 'paragraph' ? true : (node.children ?? []).some(walk)
  return walk(doc.root)
}

/** Server par document ki shape check — galat data D1 me na jaye. `true` ya error message. */
export function validateDocument(data: unknown): true | string {
  if (data === null || data === undefined) return true
  if (typeof data !== 'object' || Array.isArray(data)) return 'Board data must be an object'
  const keys = Object.keys(data)
  if (keys.some((k) => k !== 'doc')) return 'Unknown board data'
  const doc = (data as { doc?: unknown }).doc
  if (doc === undefined) return true
  if (!doc || typeof doc !== 'object') return 'Invalid document'
  const root = (doc as { root?: unknown }).root
  if (!root || typeof root !== 'object' || (root as DocNode).type !== 'root') {
    return 'The document must have a root'
  }

  let count = 0
  const walk = (node: unknown, depth: number, isRoot: boolean): string | null => {
    if (depth > MAX_DEPTH) return 'The document is nested too deeply'
    count += 1
    if (count > MAX_NODES) return `A board can have at most ${MAX_NODES} parts`
    if (!node || typeof node !== 'object' || Array.isArray(node)) return 'Invalid document part'
    const n = node as DocNode
    if (typeof n.type !== 'string') return 'Invalid document part'
    // root sirf sab se oopar
    if ((n.type === 'root') !== isRoot) return 'Invalid document root'
    const rule = NODE_RULES[n.type]
    if (!rule) return `Unknown document part: ${n.type.slice(0, 40)}`
    const problem = rule.check?.(n)
    if (problem) return problem
    if (rule.children) {
      if (!Array.isArray(n.children)) return 'Invalid document part'
      for (const child of n.children) {
        const childProblem = walk(child, depth + 1, false)
        if (childProblem) return childProblem
      }
    } else if (n.children !== undefined) {
      return 'Invalid document part'
    }
    return null
  }

  return walk(root, 0, true) ?? true
}
