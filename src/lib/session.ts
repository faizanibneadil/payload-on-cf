import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

/** Cookie se current logged-in user (ya null) */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return null

    const payload = await getPayload({ config })
    const { user } = await payload.auth({
      headers: new Headers({ cookie: `payload-token=${token}` }),
    })
    return user || null
  } catch {
    return null
  }
}
