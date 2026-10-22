import { cache } from 'react'
import { getRuntimeEnv } from './runtime-env'
import type { SessionUser } from './session'

export interface BoardRecord {
  id: number
  title: string
  slug: string
  owner: number
  isShared: boolean
  data: unknown
}

export interface BoardListItem {
  id: number
  title: string
  slug: string
  isShared: boolean
  updatedAt: string
}

/**
 * Board ka read path — seedha D1 se, Payload load kiye baghair (ek indexed query). Access rule
 * wahi jo Boards collection ka hai: admin sab, owner apna, baqi sirf shared. Caching (open decision)
 * baad me yahin lagegi.
 */
export const getBoardBySlug = cache(
  async (slug: string, user: SessionUser | null): Promise<BoardRecord | null> => {
    const { D1 } = await getRuntimeEnv()
    const row = await D1.prepare(
      'SELECT id, title, slug, owner_id, is_shared, data FROM boards WHERE slug = ?1 LIMIT 1',
    )
      .bind(slug)
      .first<{
        id: number
        title: string
        slug: string
        owner_id: number
        is_shared: number | null
        data: string | null
      }>()
    if (!row) return null
    const isShared = Boolean(row.is_shared)
    const canRead = isShared || (user && (user.role === 'admin' || user.id === row.owner_id))
    if (!canRead) return null
    let data: unknown = null
    try {
      data = row.data ? JSON.parse(row.data) : null
    } catch {
      data = null
    }
    return { id: row.id, title: row.title, slug: row.slug, owner: row.owner_id, isShared, data }
  },
)

/** "My boards" — sirf apne boards (owner index), canvas data ke baghair */
export async function listOwnBoards(userId: number): Promise<BoardListItem[]> {
  const { D1 } = await getRuntimeEnv()
  const { results } = await D1.prepare(
    `SELECT id, title, slug, is_shared, updated_at FROM boards
     WHERE owner_id = ?1 ORDER BY updated_at DESC LIMIT 100`,
  )
    .bind(userId)
    .all<{
      id: number
      title: string
      slug: string
      is_shared: number | null
      updated_at: string
    }>()
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    isShared: Boolean(r.is_shared),
    updatedAt: r.updated_at,
  }))
}
