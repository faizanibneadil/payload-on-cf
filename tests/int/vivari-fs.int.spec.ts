import { describe, it, expect } from 'vitest'
import { flattenTree, unflattenTree, DEFAULT_PLAYGROUND_FILES } from '@/components/practical-editor/vivari-fs-utils'

describe('Vivari FS Utils', () => {
  it('flattens and unflattens filesystem trees correctly', () => {
    const flattened = flattenTree(DEFAULT_PLAYGROUND_FILES)
    expect(flattened['index.html']).toBeDefined()
    expect(flattened['styles.css']).toBeDefined()
    expect(flattened['script.js']).toBeDefined()

    const unflattened = unflattenTree(flattened)
    expect(unflattened['index.html']).toBeDefined()
    expect('file' in unflattened['index.html']).toBe(true)
  })
})
