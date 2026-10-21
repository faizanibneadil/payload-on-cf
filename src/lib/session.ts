import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

/** Request ki cookie se current logged-in user (ya null) */
export async function getCurrentUser() {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await getHeaders() })
    return user ?? null
  } catch {
    return null
  }
}
