import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

/** Cookie se current logged-in user (ya null) */
export async function getCurrentUser() {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config })

    const { user } = await payload.auth({ headers })
    payload.logger.info(user)
    return user || null
  } catch {
    return null
  }
}
