'use server'

import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function loginUserAction(_prevState: any, formData: FormData) {
  const username = String(formData.get('username') || '').trim()
  const password = String(formData.get('password') || '')

  if (!username || !password) {
    return { success: false, error: 'Username and password are required' }
  }

  try {
    const payload = await getPayload({ config })
    const res = await payload.login({
      collection: 'users',
      data: {
        username,
        password,
      },
    })

    if (res?.token) {
      const cookieStore = await cookies()
      cookieStore.set('payload-token', res.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        ...(res.exp ? { expires: new Date(res.exp * 1000) } : {}),
      })
      return { success: true }
    }

    return { success: false, error: 'Invalid credentials' }
  } catch (_err: any) {
    return { success: false, error: 'Invalid username or password' }
  }
}

export async function logoutUserAction() {
  const cookieStore = await cookies()
  cookieStore.delete('payload-token')
  return { success: true }
}
