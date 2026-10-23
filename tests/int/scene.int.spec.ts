import { createHeadlessEditor } from '@lexical/headless'
import { describe, expect, it } from 'vitest'
import {
  $exportMarkdown,
  $importMarkdown,
  markdownToState,
  NODES,
} from '@/components/canvas/lexical/config'
import { readScene, validateScene } from '@/lib/scene'

const block = (over: Record<string, unknown> = {}) => ({
  id: 'a',
  type: 'text',
  x: 0,
  y: 0,
  width: 240,
  height: 40,
  zIndex: 1,
  markdown: 'hi',
  ...over,
})

// Text blocks Lexical par: saved markdown (purane boards ka bhi) bina badle wapas aana chahiye
const roundTrip = (md: string) => {
  const editor = createHeadlessEditor({
    nodes: NODES,
    onError: (e) => {
      throw e
    },
  })
  editor.update(() => $importMarkdown(md), { discrete: true })
  return editor.getEditorState().read(() => $exportMarkdown())
}

describe('text block markdown (Lexical)', () => {
  it('keeps old boards unchanged: headings, lists, paragraphs, blank lines', () => {
    const md = '# Title\n## Sub\n### Small\nPlain text\n\n- one\n- two\n1. first\n2. second'
    expect(roundTrip(md)).toBe(md)
  })

  it('keeps inline formatting and to-do lists', () => {
    const md = '- [ ] todo\n- [x] done\nThis is **bold**, *italic*, ~~gone~~ and `code`'
    expect(roundTrip(md)).toBe(md)
  })

  it('builds read-view nodes for each block type', () => {
    const types = markdownToState('# T\ntext\n- a\n1. b\n- [ ] c').root.children.map((n) => {
      const node = n as { type: string; tag?: string; listType?: string }
      return node.listType ?? node.tag ?? node.type
    })
    expect(types).toEqual(['h1', 'paragraph', 'bullet', 'number', 'check'])
  })
})

describe('scene validation', () => {
  it('accepts a valid scene and empty data', () => {
    expect(
      validateScene({ canvas: { viewport: { x: 0, y: 0, zoom: 1 }, objects: [block()] } }),
    ).toBe(true)
    expect(validateScene(null)).toBe(true)
  })

  it('rejects bad blocks', () => {
    expect(validateScene({ canvas: { objects: [block({ type: 'script' })] } })).not.toBe(true)
    expect(validateScene({ canvas: { objects: [block({ x: Number.NaN })] } })).not.toBe(true)
    expect(validateScene({ canvas: { objects: [block(), block()] } })).toBe('Duplicate block id')
    expect(validateScene({ canvas: { objects: [block({ height: 0 })] } })).toBe(
      'Invalid block height',
    )
    expect(validateScene({ canvas: { objects: [block({ height: 20_000 })] } })).toBe(
      'Invalid block height',
    )
    expect(
      validateScene({ canvas: { objects: [block({ markdown: 'a'.repeat(20_001) })] } }),
    ).not.toBe(true)
    expect(validateScene({ canvas: { viewport: { x: 0, y: 0, zoom: 99 } } })).not.toBe(true)
  })

  it('reads missing or broken data as an empty scene', () => {
    expect(readScene(null).objects).toEqual([])
    expect(readScene({ canvas: { viewport: { x: 'a', zoom: 50 } } }).viewport).toEqual({
      x: 0,
      y: 0,
      zoom: 4,
    })
  })
})
