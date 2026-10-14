// File/folder naming aur size ke shared rules (server hooks aur client dono use karte hain)

export const MAX_FILE_BYTES = 256 * 1024 // ek file ki max size
export const MAX_NODES_PER_PLAYGROUND = 100 // D1/Workers subrequest limits ke liye cap
export const MAX_DEPTH = 6 // folders ki max gehrai

const INVALID_NAME = /[\\/:*?"<>|]/

const hasControlChars = (value: string) => Array.from(value).some((char) => char.charCodeAt(0) < 32)

export function validateNodeName(value: unknown): true | string {
  if (typeof value !== 'string') return 'Name is required'
  const name = value.trim()
  if (!name) return 'Name is required'
  if (name.length > 100) return 'Name must be at most 100 characters'
  if (name === '.' || name === '..') return 'Invalid name'
  if (INVALID_NAME.test(name) || hasControlChars(name)) return 'Name contains invalid characters'
  return true
}

export function byteLength(value: string | null | undefined): number {
  return value ? new TextEncoder().encode(value).length : 0
}
