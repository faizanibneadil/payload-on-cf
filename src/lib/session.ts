import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { getRuntimeEnv } from './runtime-env'

export interface SessionUser {
  id: number
  username: string
  role: 'admin' | 'instructor'
  collection: 'users'
}

// Payload ka JWT format (payload/dist/auth/jwt.js + strategies/jwt.js): HS256, header me authVersion 1
const JWT_AUTH_VERSION = 1
const COOKIE = 'payload-token'

async function secretKey(secret: string) {
  // Payload: sha256(PAYLOAD_SECRET) ka hex, pehle 32 characters
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return new TextEncoder().encode(hex.slice(0, 32))
}

let keyCache: { secret: string; key: Uint8Array } | null = null

/**
 * Request ki cookie se current user — Payload load kiye baghair (free plan ka CPU bachane ke liye).
 * Token Payload ki tarah verify hota hai, aur session (`users_sessions`) ek halki D1 query se check
 * hota hai, taake sign out ke baad purana token kaam na kare. Ek request me sirf ek dafa chalta hai.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const token = (await cookies()).get(COOKIE)?.value
    if (!token) return null
    const { D1, payloadSecret } = await getRuntimeEnv()
    if (!payloadSecret) return null
    if (keyCache?.secret !== payloadSecret) {
      keyCache = { secret: payloadSecret, key: await secretKey(payloadSecret) }
    }
    const { payload, protectedHeader } = await jwtVerify(token, keyCache.key, {
      algorithms: ['HS256'],
    })
    if (protectedHeader.authVersion !== JWT_AUTH_VERSION) return null
    const { id, collection, sid } = payload as { id?: unknown; collection?: unknown; sid?: unknown }
    if (collection !== 'users' || typeof sid !== 'string' || typeof id !== 'number') return null

    const row = await D1.prepare(
      `SELECT u.id, u.username, u.role FROM users u
       JOIN users_sessions s ON s._parent_id = u.id
       WHERE u.id = ?1 AND s.id = ?2 AND s.expires_at > ?3 LIMIT 1`,
    )
      .bind(id, sid, new Date().toISOString())
      .first<{ id: number; username: string; role: string }>()
    if (!row) return null
    return {
      id: row.id,
      username: row.username,
      role: row.role === 'admin' ? 'admin' : 'instructor',
      collection: 'users',
    }
  } catch {
    // Expired / ghalat token = signed out
    return null
  }
})
