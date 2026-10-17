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

export function validateTitle(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Title is required'
  }
  if (value.trim().length > 50) {
    return 'Title must be at most 50 characters'
  }
  const normalized = normalizeTitle(value)
  if (!normalized) {
    return 'Title must contain at least one valid character (a-z, 0-9, -)'
  }
  return true
}
