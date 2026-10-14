import type { Monaco } from '@monaco-editor/react'
import type { editor, Position } from 'monaco-editor'

interface ScannedTag {
  name: string
  isClose: boolean
  selfClose: boolean
  nameStart: number
  nameEnd: number
}

function scanTags(text: string): ScannedTag[] {
  const re = /<\/?([a-zA-Z][a-zA-Z0-9:_.-]*)(?:\s[^<>]*?)?\/?>/g
  const tags: ScannedTag[] = []
  let m: RegExpExecArray | null = re.exec(text)
  while (m) {
    const isClose = m[0][1] === '/'
    const selfClose = m[0].endsWith('/>')
    const nameStart = m.index + (isClose ? 2 : 1)
    tags.push({ name: m[1], isClose, selfClose, nameStart, nameEnd: nameStart + m[1].length })
    m = re.exec(text)
  }
  return tags
}

function findMatch(tags: ScannedTag[], idx: number): ScannedTag | null {
  if (idx === -1 || tags[idx].selfClose) return null
  const stack: { tag: ScannedTag; i: number }[] = []
  for (let i = 0; i < tags.length; i++) {
    const t = tags[i]
    if (t.selfClose) continue
    if (!t.isClose) {
      stack.push({ tag: t, i })
    } else {
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag.name === t.name) {
          const opened = stack[k]
          stack.length = k
          if (i === idx) return opened.tag
          if (opened.i === idx) return t
          break
        }
      }
    }
  }
  return null
}

let disposable: { dispose: () => void } | null = null

/** Monaco ka native "linked editing" — opening tag rename karo to closing tag sath badle (Auto Rename Tag) */
export function registerTagRenameSync(monaco: Monaco) {
  disposable?.dispose()
  disposable = monaco.languages.registerLinkedEditingRangeProvider('html', {
    provideLinkedEditingRanges(model: editor.ITextModel, position: Position) {
      const offset = model.getOffsetAt(position)
      const tags = scanTags(model.getValue())

      const idx = tags.findIndex((t) => offset >= t.nameStart && offset <= t.nameEnd)
      if (idx === -1) return null

      const other = findMatch(tags, idx)
      if (!other) return null

      const toRange = (t: ScannedTag) => {
        const start = model.getPositionAt(t.nameStart)
        const end = model.getPositionAt(t.nameEnd)
        return {
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        }
      }

      return {
        ranges: [toRange(tags[idx]), toRange(other)],
        wordPattern: /[a-zA-Z0-9:_.-]+/,
      }
    },
  })
  return disposable
}
