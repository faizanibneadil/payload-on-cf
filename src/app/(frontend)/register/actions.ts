'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function registerUserAction(prevState: any, formData: FormData) {
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
      error: 'Username must be 3-30 characters and contain only lowercase letters, numbers, underscores, and hyphens',
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
    if (err?.message?.includes('unique') || err?.data?.[0]?.message?.includes('unique')) {
      return { success: false, error: 'Username is already taken' }
    }
    return { success: false, error: 'An error occurred during registration. Please try again.' }
  }
}
