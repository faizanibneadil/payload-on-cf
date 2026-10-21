'use server'

import { getPayload, ValidationError } from 'payload'
import { getCurrentUser } from '@/lib/session'
import { validateTitle } from '@/lib/title-slug'
import config from '@/payload.config'

export type CreateBoardResult = { ok: boolean; slug?: string; error?: string }

export async function createBoardAction(input: { title: string }): Promise<CreateBoardResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please sign in first' }

  const titleCheck = validateTitle(input.title)
  if (titleCheck !== true) return { ok: false, error: titleCheck }

  try {
    const payload = await getPayload({ config })
    const board = await payload.create({
      collection: 'boards',
      data: {
        title: input.title.trim(),
        // asal slug beforeValidate hook title se banata hai
        slug: '',
        owner: user.id,
        isShared: false,
        data: { canvas: { version: 1, viewport: { x: 0, y: 0, zoom: 1 }, objects: [] } },
      },
      depth: 0,
      user,
      overrideAccess: false,
    })
    return { ok: true, slug: board.slug }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: err.data.errors[0]?.message ?? 'Invalid board' }
    }
    console.error('[createBoardAction] failed', err)
    return { ok: false, error: 'Could not create the board. Please try again.' }
  }
}
