export function normalizeTitle(input: string): string {
  if (!input) return ''
  let normalized = input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')

  if (normalized.length > 50) {
    normalized = normalized.slice(0, 50).replace(/-+$/, '')
  }
  return normalized
}

export function generateFallbackTitle(): string {
  const shortId = Math.random().toString(36).substring(2, 8)
  return `untitled-${shortId}`
}

export function generateForkTitle(originalTitle: string, suffixCount?: number): string {
  const suffix = suffixCount && suffixCount > 0 ? `-fork-${suffixCount}` : '-fork'
  const maxOriginalLength = 50 - suffix.length

  let base = normalizeTitle(originalTitle) || 'untitled'
  if (base.length > maxOriginalLength) {
    base = base.slice(0, maxOriginalLength).replace(/-+$/, '')
  }
  return `${base}${suffix}`
}

export function validateTitle(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Title is required'
  }
  const normalized = normalizeTitle(value)
  if (!normalized) {
    return 'Title must contain at least one valid character (a-z, 0-9, -)'
  }
  if (normalized.length > 50) {
    return 'Title cannot exceed 50 characters'
  }
  return true
}
