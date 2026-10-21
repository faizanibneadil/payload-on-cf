import { type CollectionConfig, ValidationError, type Where } from 'payload'
import { getLimitSettings } from '../globals/Settings'
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

        if (!data.title) return data
        if (operation === 'update' && originalDoc?.title === data.title) {
          data.slug = originalDoc.slug
          return data
        }

        // Create par Payload originalDoc ko khali object deta hai — id sirf update par hoti hai
        const selfId = originalDoc?.id
        const base = normalizeTitle(data.title)

        // Slug globally unique hona chahiye (URL: /b/[slug]); collision par suffix lagao
        let slug = base
        for (let attempt = 1; attempt < 20; attempt++) {
          const existing = await req.payload.find({
            collection: 'boards',
            where: {
              and: [
                { slug: { equals: slug } },
                ...(selfId !== undefined && selfId !== null
                  ? [{ id: { not_equals: selfId } }]
                  : []),
              ],
            },
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
      ({ req, operation, data, originalDoc }) => {
        if (!req.user) return data

        if (operation === 'create') {
          // Non-admin hamesha apna hi owner hoga
          if (!data.owner || !isAdminUser(req.user)) data.owner = req.user.id
        } else if (operation === 'update' && !isAdminUser(req.user) && originalDoc) {
          data.owner = ownerId(originalDoc.owner)
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
