import { describe, it, expect } from 'vitest'
import { normalizeTitle, validateTitle } from '@/lib/title-slug'

describe('Title and Slug Utils', () => {
  it('normalizes titles correctly', () => {
    expect(normalizeTitle('My First Playground!')).toBe('my-first-playground')
    expect(normalizeTitle('   Space   Test   ')).toBe('space-test')
    expect(normalizeTitle('Special $#@ Characters')).toBe('special-characters')
  })

  it('validates titles', () => {
    expect(validateTitle('Valid Title')).toBe(true)
    expect(validateTitle('')).toBe('Title is required')
    expect(validateTitle('a'.repeat(51))).toBe('Title must be at most 50 characters')
  })
})
