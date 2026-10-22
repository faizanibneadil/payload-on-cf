'use server'

import { getPayload } from 'payload'
import { getLimitSettings } from '@/globals/Settings'
import { getCurrentUser } from '@/lib/session'
import { validateTitle } from '@/lib/title-slug'
import config from '@/payload.config'

export type CreateBoardResult = { ok: boolean; slug?: string; error?: string }
export type SaveBoardResult = { ok: boolean; error?: string; savesLeft?: number | null }
export type ShareBoardResult = { ok: boolean; error?: string; isShared?: boolean }

/**
 * Payload errors ko user ke liye saaf message me badlo. `instanceof` production bundle me
 * bharosemand nahi (class names minify + do copies) — isliye shape aur status dekhte hain.
 */
function toMessage(err: unknown, fallback: string, context: string) {
  const e = (err ?? {}) as {
    status?: number
    message?: string
    data?: { errors?: { message?: string }[] }
  }
  const fieldError = e.data?.errors?.[0]?.message
  if (fieldError) return fieldError
  if (e.status === 429 && e.message) return e.message
  if (e.status === 403 || e.status === 404) return 'You are not allowed to change this board.'
  console.error(`[${context}] failed`, err)
  return fallback
}

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
    return {
      ok: false,
      error: toMessage(err, 'Could not create the board. Please try again.', 'createBoardAction'),
    }
  }
}

/** "Save" — title aur canvas ek hi row write me. Limits Boards ke hook me lagti hain. */
export async function saveBoardAction(input: {
  id: number
  title: string
  data: unknown
}): Promise<SaveBoardResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Your session has ended. Please sign in again.' }

  const titleCheck = validateTitle(input.title)
  if (titleCheck !== true) return { ok: false, error: titleCheck }

  try {
    const payload = await getPayload({ config })
    const board = await payload.update({
      collection: 'boards',
      id: input.id,
      data: { title: input.title.trim(), data: input.data as Record<string, unknown> },
      depth: 0,
      select: { saveCount: true },
      user,
      overrideAccess: false,
    })
    if (user.role === 'admin') return { ok: true, savesLeft: null }
    const { maxSavesPerBoardPerWindow } = await getLimitSettings(payload)
    return { ok: true, savesLeft: Math.max(0, maxSavesPerBoardPerWindow - (board.saveCount ?? 0)) }
  } catch (err) {
    return {
      ok: false,
      error: toMessage(err, 'Could not save the board. Please try again.', 'saveBoardAction'),
    }
  }
}

/** Share on/off — Save count nahi hota (hook sirf content change ginta hai) */
export async function setBoardSharedAction(input: {
  id: number
  isShared: boolean
}): Promise<ShareBoardResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Your session has ended. Please sign in again.' }

  try {
    const payload = await getPayload({ config })
    const board = await payload.update({
      collection: 'boards',
      id: input.id,
      data: { isShared: input.isShared },
      depth: 0,
      select: { isShared: true },
      user,
      overrideAccess: false,
    })
    return { ok: true, isShared: Boolean(board.isShared) }
  } catch (err) {
    return {
      ok: false,
      error: toMessage(err, 'Could not change sharing. Please try again.', 'setBoardSharedAction'),
    }
  }
}
