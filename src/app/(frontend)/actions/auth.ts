'use server'

import { login, logout } from '@payloadcms/next/auth'
import { getPayload } from 'payload'
import {
  normalizeUsername,
  RESERVED_USERNAMES,
  validatePassword,
  validateUsername,
} from '@/lib/username'
import config from '@/payload.config'

// strictNullChecks band hai, isliye discriminated union ki jagah simple shape
export type AuthResult = { ok: boolean; error?: string; field?: string }

async function signIn(username: string, password: string): Promise<AuthResult> {
  try {
    await login({ collection: 'users', config, username, password })
    return { ok: true }
  } catch (err) {
    const name = (err as { name?: string })?.name
    if (name === 'LockedAuth') {
      return { ok: false, error: 'Too many failed attempts. Please try again in a few minutes.' }
    }
    if (name === 'AuthenticationError') {
      return { ok: false, error: 'Invalid username or password' }
    }
    // Galat credentials ke ilawa baaqi errors server ke masle hain — log karo
    console.error('[signIn] failed', err)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function loginAction(input: {
  username: string
  password: string
}): Promise<AuthResult> {
  const username = normalizeUsername(input.username)
  if (!username || !input.password) {
    return { ok: false, error: 'Username and password are required' }
  }
  return signIn(username, input.password)
}

export async function registerAction(input: {
  username: string
  password: string
  confirmPassword: string
  /** honeypot — insaan ise khali chhorta hai */
  website?: string
}): Promise<AuthResult> {
  if (input.website) return { ok: false, error: 'Registration failed' }

  const username = normalizeUsername(input.username)
  const usernameCheck = validateUsername(username)
  if (usernameCheck !== true) return { ok: false, error: usernameCheck, field: 'username' }
  if (RESERVED_USERNAMES.includes(username)) {
    return { ok: false, error: 'This username is reserved', field: 'username' }
  }
  const passwordCheck = validatePassword(input.password)
  if (passwordCheck !== true) return { ok: false, error: passwordCheck, field: 'password' }
  if (input.password !== input.confirmPassword) {
    return { ok: false, error: 'Passwords do not match', field: 'confirmPassword' }
  }

  try {
    const payload = await getPayload({ config })
    // Pehle se maujood username ka saaf message (Payload ka unique error generic hota hai)
    const taken = await payload.count({
      collection: 'users',
      where: { username: { equals: username } },
      overrideAccess: true,
    })
    if (taken.totalDocs > 0) {
      return { ok: false, error: 'This username is already taken', field: 'username' }
    }

    // Public registration: role hamesha instructor (client role choose nahi kar sakta)
    await payload.create({
      collection: 'users',
      data: { username, password: input.password, role: 'instructor' },
      overrideAccess: true,
    })
  } catch (err) {
    console.error('[registerAction] failed', err)
    return { ok: false, error: 'Registration failed. Please try again.' }
  }

  // Register ke baad seedha sign in
  return signIn(username, input.password)
}

export async function logoutAction(): Promise<void> {
  await logout({ config, allSessions: false })
}
