'use server'

import { cookies } from 'next/headers'
// import { getPayload } from 'payload'
import config from '@/payload.config'
import { login, logout } from '@payloadcms/next/auth'

export async function loginUserAction(_prevState: any, formData: FormData) {
  const username = String(formData.get('username') || '').trim()
  const password = String(formData.get('password') || '')

  if (!username || !password) {
    return { success: false, error: 'Username and password are required' }
  }

  try {
    const result = await login({
      collection: 'users',
      config,
      username,
      password,
    })
    return result
  } catch (error) {
    throw new Error(
      `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export async function logoutUserAction() {
  // const cookieStore = await cookies()
  // cookieStore.delete('payload-token')
  logout({ config, allSessions: false })
  return { success: true }
}
