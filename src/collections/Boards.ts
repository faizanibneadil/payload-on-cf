import { APIError, type CollectionConfig, type Payload, ValidationError, type Where } from 'payload'
import { getLimitSettings } from '../globals/Settings'
import { validateScene } from '../lib/scene'
import { normalizeTitle, validateTitle } from '../lib/title-slug'

const ownerId = (owner: unknown): number | string | undefined =>
  owner && typeof owner === 'object'
    ? (owner as { id: number | string }).id
    : (owner as number | string | undefined)

const isAdminUser = (user: { role?: string } | null | undefined) => user?.role === 'admin'

// Update/delete sirf owner (ya admin)
const ownerOrAdmin = ({ req: { user } }: { req: { user: any } }): boolean | Where => {
  if (!user) return false
  if (isAdminUser(user)) return true
  return { owner: { equals: user.id } }
}

// Counters sirf hooks likhte hain — client se sirf admin badal sakta hai
const adminOnlyField = {
  create: ({ req: { user } }: { req: { user: any } }) => isAdminUser(user),
  update: ({ req: { user } }: { req: { user: any } }) => isAdminUser(user),
}

const HOUR_MS = 60 * 60 * 1000

function formatWait(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

// 429 — action aur REST dono me saaf message ke saath
const limitError = (message: string) => new APIError(message, 429, null, true)

/** Instructor window (default 24 h) me max boards bana sakta hai (owner + createdAt index) */
async function assertCanCreate(payload: Payload, userId: number | string) {
  const { windowHours, maxBoardsPerWindow } = await getLimitSettings(payload)
  const windowMs = windowHours * HOUR_MS
  const since = new Date(Date.now() - windowMs).toISOString()
  const recent = await payload.find({
    collection: 'boards',
    where: { and: [{ owner: { equals: userId } }, { createdAt: { greater_than: since } }] },
    sort: 'createdAt',
    limit: 1,
    depth: 0,
    select: { createdAt: true },
    overrideAccess: true,
  })
  if (recent.totalDocs >= maxBoardsPerWindow) {
    const oldest = recent.docs[0]?.createdAt
    const waitMs = oldest ? new Date(oldest).getTime() + windowMs - Date.now() : windowMs
    throw limitError(
      `You can create up to ${maxBoardsPerWindow} boards every ${windowHours} hours. Try again in ${formatWait(waitMs)}.`,
    )
  }
}

function contentChanged(data: Record<string, any>, originalDoc: Record<string, any>) {
  if (data.title !== undefined && data.title !== originalDoc.title) return true
  if (data.data !== undefined && JSON.stringify(data.data) !== JSON.stringify(originalDoc.data)) {
    return true
  }
  return false
}

/** Har board par window me max saves; counter isi row write ka hissa hai (koi extra write nahi) */
async function applySaveLimit(
  payload: Payload,
  data: Record<string, any>,
  originalDoc: Record<string, any>,
) {
  const { windowHours, maxSavesPerBoardPerWindow } = await getLimitSettings(payload)
  const windowMs = windowHours * HOUR_MS
  const now = Date.now()
  const started = originalDoc.saveWindowStartedAt
    ? new Date(originalDoc.saveWindowStartedAt).getTime()
    : 0
  const windowOver = !started || now - started >= windowMs
  const count = windowOver ? 0 : (originalDoc.saveCount ?? 0)
  if (count >= maxSavesPerBoardPerWindow) {
    throw limitError(
      `This board can be saved ${maxSavesPerBoardPerWindow} times every ${windowHours} hours. Try again in ${formatWait(started + windowMs - now)}.`,
    )
  }
  data.saveCount = count + 1
  data.saveWindowStartedAt = windowOver
    ? new Date(now).toISOString()
    : originalDoc.saveWindowStartedAt
}

export const Boards: CollectionConfig = {
  slug: 'boards',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'owner', 'isShared', 'updatedAt'],
  },
  // "har instructor ke 24 ghante me boards" wali count query ke liye
  indexes: [{ fields: ['owner', 'createdAt'] }],
  access: {
    // Owner apne sab boards dekhta hai; baqi sab sirf shared (link wale) boards
    read: ({ req: { user } }): boolean | Where => {
      if (isAdminUser(user)) return true
      if (user) return { or: [{ owner: { equals: user.id } }, { isShared: { equals: true } }] }
      return { isShared: { equals: true } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data

        // Board ka size limit (D1 row limit 2 MB) — settings Global se, cache ke saath
        if (data.data !== undefined) {
          // Canvas ki shape (block types, numbers, limits) — galat data D1 me na jaye
          const sceneCheck = validateScene(data.data)
          if (sceneCheck !== true) {
            throw new ValidationError({
              collection: 'boards',
              errors: [{ path: 'data', message: sceneCheck }],
              req,
            })
          }
          const { maxContentBytes } = await getLimitSettings(req.payload)
          const bytes = new TextEncoder().encode(JSON.stringify(data.data ?? null)).length
          if (bytes > maxContentBytes) {
            throw new ValidationError({
              collection: 'boards',
              errors: [
                {
                  path: 'data',
                  message: `This board is too large (${Math.ceil(bytes / 1024)} KB). The limit is ${Math.floor(maxContentBytes / 1024)} KB.`,
                },
              ],
              req,
            })
          }
        }

        // Slug sirf create par banta hai aur phir kabhi nahi badalta — share kiya hua link title
        // badalne par bhi chalta rahe
        if (operation !== 'create') {
          if (originalDoc?.slug) data.slug = originalDoc.slug
          return data
        }
        if (!data.title) return data
        const base = normalizeTitle(data.title)

        // Slug globally unique hona chahiye (URL: /b/[slug]); collision par suffix lagao
        let slug = base
        for (let attempt = 1; attempt < 20; attempt++) {
          const existing = await req.payload.find({
            collection: 'boards',
            where: { slug: { equals: slug } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
            req,
          })
          if (existing.docs.length === 0) break
          const suffix = `-${Math.random().toString(36).slice(2, 6)}`
          slug = `${base.slice(0, 50 - suffix.length).replace(/-+$/, '')}${suffix}`
        }
        data.slug = slug
        return data
      },
    ],
    beforeChange: [
      async ({ req, operation, data, originalDoc }) => {
        if (!req.user) return data

        if (operation === 'create') {
          // Non-admin hamesha apna hi owner hoga
          if (!data.owner || !isAdminUser(req.user)) data.owner = req.user.id
          if (!isAdminUser(req.user)) await assertCanCreate(req.payload, req.user.id)
          data.saveCount = 0
          return data
        }

        if (operation === 'update' && !isAdminUser(req.user) && originalDoc) {
          data.owner = ownerId(originalDoc.owner)
          // Sirf content (title ya canvas) badle to Save count hota hai — Share on/off nahi
          if (contentChanged(data, originalDoc)) {
            await applySaveLimit(req.payload, data, originalDoc)
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 50,
      validate: (value: unknown) => validateTitle(value),
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
      // Slug sirf beforeValidate hook banata hai (title se) — client direct set nahi kar sakta
      access: adminOnlyField,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      // Share on ho to link wala koi bhi board read-only dekh sakta hai
      name: 'isShared',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      // Poora canvas (scene JSON) ek hi row me — ek Save = ek row write
      name: 'data',
      type: 'json',
    },
    {
      name: 'saveCount',
      type: 'number',
      defaultValue: 0,
      access: adminOnlyField,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'saveWindowStartedAt',
      type: 'date',
      access: adminOnlyField,
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
