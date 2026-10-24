import { describe, expect, it } from 'vitest'
import {
  emptyDocument,
  hasContent,
  MAX_DEPTH,
  MAX_TEXT_CHARS,
  readDocument,
  validateDocument,
} from '@/lib/document'

const text = (value: string, extra: Record<string, unknown> = {}) => ({
  type: 'text',
  version: 1,
  text: value,
  format: 0,
  style: '',
  mode: 'normal',
  detail: 0,
  ...extra,
})
const paragraph = (children: unknown[] = []) => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: null as null,
  children,
})
const docOf = (children: unknown[]) => ({
  doc: {
    root: { type: 'root', version: 1, format: '', indent: 0, direction: null as null, children },
  },
})

describe('document validation', () => {
  it('accepts empty data, an empty document and paragraphs with text', () => {
    expect(validateDocument(null)).toBe(true)
    expect(validateDocument(undefined)).toBe(true)
    expect(validateDocument({})).toBe(true)
    expect(validateDocument({ doc: emptyDocument() })).toBe(true)
    expect(
      validateDocument(
        docOf([
          paragraph([text('Hello'), { type: 'linebreak', version: 1 }, text('world')]),
          paragraph([{ type: 'tab', version: 1, text: '\t' }, text('indented')]),
        ]),
      ),
    ).toBe(true)
  })

  it('rejects the old canvas format and unknown data', () => {
    expect(validateDocument({ canvas: { objects: [] } })).toBe('Unknown board data')
    expect(validateDocument('text')).toBe('Board data must be an object')
    expect(validateDocument([])).toBe('Board data must be an object')
    expect(validateDocument({ doc: 'x' })).toBe('Invalid document')
    expect(validateDocument({ doc: {} })).toBe('The document must have a root')
    expect(validateDocument({ doc: { root: { type: 'paragraph', children: [] } } })).toBe(
      'The document must have a root',
    )
  })

  it('rejects unknown node types and a root inside the document', () => {
    expect(validateDocument(docOf([{ type: 'script', version: 1 }]))).toBe(
      'Unknown document part: script',
    )
    expect(validateDocument(docOf([paragraph([{ type: 'root', children: [] }])]))).toBe(
      'Invalid document root',
    )
    expect(validateDocument(docOf([null]))).toBe('Invalid document part')
    expect(validateDocument(docOf([{ version: 1 }]))).toBe('Invalid document part')
  })

  it('checks children lists and text fields', () => {
    expect(validateDocument(docOf([{ type: 'paragraph', version: 1 }]))).toBe(
      'Invalid document part',
    )
    expect(validateDocument(docOf([paragraph([{ ...text('a'), children: [] }])]))).toBe(
      'Invalid document part',
    )
    expect(validateDocument(docOf([paragraph([text('a', { text: 5 })])]))).toBe('Invalid text')
    expect(validateDocument(docOf([paragraph([text('a', { format: -1 })])]))).toBe(
      'Invalid text format',
    )
    expect(validateDocument(docOf([paragraph([text('a', { format: 1.5 })])]))).toBe(
      'Invalid text format',
    )
    expect(validateDocument(docOf([paragraph([text('a', { style: 3 })])]))).toBe(
      'Invalid text style',
    )
    expect(validateDocument(docOf([paragraph([text('a'.repeat(MAX_TEXT_CHARS + 1))])]))).toBe(
      `A piece of text can have at most ${MAX_TEXT_CHARS} characters`,
    )
  })

  it('accepts headings h1-h6 and rejects other levels', () => {
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(
        validateDocument(docOf([{ ...paragraph([text('Title')]), type: 'heading', tag }])),
      ).toBe(true)
    }
    expect(
      validateDocument(docOf([{ ...paragraph([text('x')]), type: 'heading', tag: 'h7' }])),
    ).toBe('Invalid heading level')
    expect(validateDocument(docOf([{ ...paragraph(), type: 'heading' }]))).toBe(
      'Invalid heading level',
    )
  })

  it('accepts quotes with text and line breaks', () => {
    expect(
      validateDocument(
        docOf([{ ...paragraph([text('Said'), { type: 'linebreak', version: 1 }]), type: 'quote' }]),
      ),
    ).toBe(true)
  })

  it('rejects documents nested too deeply', () => {
    let node: unknown = text('deep')
    for (let i = 0; i <= MAX_DEPTH; i++) node = paragraph([node])
    expect(validateDocument(docOf([node]))).toBe('The document is nested too deeply')
  })
})

describe('reading a board document', () => {
  it('turns missing, old or broken data into an empty document', () => {
    expect(readDocument(null)).toEqual(emptyDocument())
    expect(readDocument({ canvas: { objects: [{ type: 'text', markdown: '# Old' }] } })).toEqual(
      emptyDocument(),
    )
    expect(readDocument({ doc: { root: { type: 'script' } } })).toEqual(emptyDocument())
  })

  it('keeps a valid document as it is', () => {
    const data = docOf([paragraph([text('Lecture 1')])])
    expect(readDocument(data)).toBe(data.doc)
  })

  it('knows whether a document has any content', () => {
    expect(hasContent(emptyDocument())).toBe(false)
    expect(hasContent(readDocument(docOf([paragraph(), paragraph()])))).toBe(false)
    expect(hasContent(readDocument(docOf([paragraph([text('Hi')])])))).toBe(true)
  })
})
