import { describe, it, expect } from 'vitest'
import {
  normalizeTitle,
  validateTitle,
  generateFallbackTitle,
  generateForkTitle,
} from '@/lib/title-slug'

describe('Title and Slug Utilities', () => {
  it('normalizes title correctly', () => {
    expect(normalizeTitle('My Awesome Playground!')).toBe('my-awesome-playground')
    expect(normalizeTitle('   HELLO   WORLD   ')).toBe('hello-world')
    expect(normalizeTitle('A'.repeat(60))).toBe('a'.repeat(50))
  })

  it('validates title properly', () => {
    expect(validateTitle('valid-title')).toBe(true)
    expect(validateTitle('')).toBe('Title is required')
    expect(validateTitle('!!!')).toBe('Title must contain at least one valid character (a-z, 0-9, -)')
  })

  it('generates fallback title', () => {
    const fallback = generateFallbackTitle()
    expect(fallback).toMatch(/^untitled-[a-z0-9]{6}$/)
  })

  it('generates fork title maintaining 50 character limit', () => {
    expect(generateForkTitle('my-playground')).toBe('my-playground-fork')
    expect(generateForkTitle('my-playground', 2)).toBe('my-playground-fork-2')

    const longTitle = 'a'.repeat(50)
    const forkTitle = generateForkTitle(longTitle, 1)
    expect(forkTitle.length).toBeLessThanOrEqual(50)
    expect(forkTitle.endsWith('-fork-1')).toBe(true)
  })
})
