import type { Endpoint, PayloadRequest } from 'payload'
import { getLimitSettings } from '../globals/Settings'
import { toStatus, toUserMessage } from '../lib/payload-errors'
import { validateTitle } from '../lib/title-slug'

/**
 * Save aur Share ke liye saade HTTP endpoints (server actions nahi). Server action build se jude
 * hote hain: deploy ke dauraan purana page naye version ko action bheje to Next poora page reload
 * kar deta hai aur unsaved kaam chala jata hai. Yeh endpoints har version par ek jaisa JSON dete hain.
 * Access control aur limits wahi Boards collection ke hooks/access lagate hain.
 */

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status })

async function readBody(req: PayloadRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json?.()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const boardId = (req: PayloadRequest) => {
  const id = Number(req.routeParams?.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const saveBoardEndpoint: Endpoint = {
  path: '/:id/save',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return json({ ok: false, error: 'Your session has ended. Please sign in again.' }, 401)
    }
    const id = boardId(req)
    const body = await readBody(req)
    if (!id || !body) return json({ ok: false, error: 'Invalid request' }, 400)

    const title = typeof body.title === 'string' ? body.title : ''
    const titleCheck = validateTitle(title)
    if (titleCheck !== true) return json({ ok: false, error: titleCheck }, 400)

    try {
      const board = await req.payload.update({
        collection: 'boards',
        id,
        data: { title: title.trim(), data: body.data as Record<string, unknown> },
        depth: 0,
        select: { saveCount: true },
        user: req.user,
        overrideAccess: false,
        req,
      })
      if (req.user.role === 'admin') return json({ ok: true, savesLeft: null })
      const { maxSavesPerBoardPerWindow } = await getLimitSettings(req.payload)
      return json({
        ok: true,
        savesLeft: Math.max(0, maxSavesPerBoardPerWindow - (board.saveCount ?? 0)),
      })
    } catch (err) {
      return json(
        {
          ok: false,
          error: toUserMessage(err, 'Could not save the board. Please try again.', 'saveBoard'),
        },
        toStatus(err),
      )
    }
  },
}

export const shareBoardEndpoint: Endpoint = {
  path: '/:id/share',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return json({ ok: false, error: 'Your session has ended. Please sign in again.' }, 401)
    }
    const id = boardId(req)
    const body = await readBody(req)
    if (!id || !body || typeof body.isShared !== 'boolean') {
      return json({ ok: false, error: 'Invalid request' }, 400)
    }
    try {
      const board = await req.payload.update({
        collection: 'boards',
        id,
        data: { isShared: body.isShared },
        depth: 0,
        select: { isShared: true },
        user: req.user,
        overrideAccess: false,
        req,
      })
      return json({ ok: true, isShared: Boolean(board.isShared) })
    } catch (err) {
      return json(
        {
          ok: false,
          error: toUserMessage(err, 'Could not change sharing. Please try again.', 'shareBoard'),
        },
        toStatus(err),
      )
    }
  },
}
