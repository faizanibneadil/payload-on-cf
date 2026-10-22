import { describe, expect, it } from 'vitest'
import {
  parseMarkdown,
  readScene,
  serializeMarkdown,
  shortcutFor,
  validateScene,
} from '@/lib/scene'

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

describe('scene markdown', () => {
  it('parses and serializes block markdown both ways', () => {
    const md = '# Title\n## Sub\n### Small\nPlain text\n- one\n- two\n1. first\n2. second'
    const lines = parseMarkdown(md)
    expect(lines.map((l) => l.type)).toEqual(['h1', 'h2', 'h3', 'p', 'ul', 'ul', 'ol', 'ol'])
    expect(serializeMarkdown(lines)).toBe(md)
  })

  it('renumbers ordered lists and restarts after other lines', () => {
    const lines = parseMarkdown('5. a\n9. b\ntext\n3. c')
    expect(serializeMarkdown(lines)).toBe('1. a\n2. b\ntext\n1. c')
  })

  it('maps line-start shortcuts', () => {
    expect(shortcutFor('#')).toBe('h1')
    expect(shortcutFor('###')).toBe('h3')
    expect(shortcutFor('-')).toBe('ul')
    expect(shortcutFor('12.')).toBe('ol')
    expect(shortcutFor('####')).toBeNull()
    expect(shortcutFor('a')).toBeNull()
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
