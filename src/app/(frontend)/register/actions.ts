'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function registerUserAction(_prevState: any, formData: FormData) {
  const honeypot = formData.get('website')
  if (honeypot) {
    return { success: false, error: 'Registration failed' }
  }

  const username = String(formData.get('username') || '').trim()
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')

  if (!username || !password || !confirmPassword) {
    return { success: false, error: 'All fields are required' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match' }
  }

  if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
    return {
      success: false,
      error:
        'Username must be 3-30 characters and contain only lowercase letters, numbers, underscores, and hyphens',
    }
  }

  if (password.length < 8 || password.length > 128) {
    return {
      success: false,
      error: 'Password must be between 8 and 128 characters',
    }
  }

  try {
    const payload = await getPayload({ config })

    // Pehle se maujood username ka saaf message (Payload ka unique error generic hota hai)
    const existing = await payload.find({
      collection: 'users',
      where: { username: { equals: username } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      return { success: false, error: 'Username is already taken' }
    }

    await payload.create({
      collection: 'users',
      data: {
        username,
        password,
        role: 'user',
      },
      overrideAccess: true,
    })

    return { success: true }
  } catch (err: any) {
    console.error('[registerUserAction] failed', err)
    return { success: false, error: 'An error occurred during registration. Please try again.' }
  }
}
