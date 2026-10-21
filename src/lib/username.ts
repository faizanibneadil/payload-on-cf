// Username aur password ke rules — client form aur server (hook + action) dono yahi use karte hain

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

// "admin" CI seed script ke liye reserved hai (koi instructor pehle register na kar le)
export const RESERVED_USERNAMES = ['admin']

const USERNAME_PATTERN = /^[a-z0-9_]+$/

/** Case-insensitive unique ke liye hamesha lowercase me save hota hai */
export function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function validateUsername(value: unknown): true | string {
  const username = normalizeUsername(value)
  if (!username) return 'Username is required'
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username can only contain letters a-z, numbers 0-9 and underscores'
  }
  return true
}

export function validatePassword(value: unknown): true | string {
  if (typeof value !== 'string' || !value) return 'Password is required'
  if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`
  if (value.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`
  return true
}
