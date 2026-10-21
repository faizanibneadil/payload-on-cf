import type { CollectionConfig, Where } from 'payload'
import { normalizeTitle, validateTitle } from '../lib/title-slug'

const ownerId = (owner: unknown): number | string | undefined =>
  owner && typeof owner === 'object'
    ? (owner as { id: number | string }).id
    : (owner as number | string | undefined)

export const Playgrounds: CollectionConfig = {
  slug: 'playgrounds',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'owner', 'createdAt'],
  },
  access: {
    // Share link wale sab students playground read-only dekh sakte hain
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    // Edit/delete sirf owner (ya admin). Theory bhi isi update access se owner-only hai.
    update: ({ req: { user } }): boolean | Where => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { owner: { equals: user.id } }
    },
    delete: ({ req: { user } }): boolean | Where => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { owner: { equals: user.id } }
    },
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data?.title) return data
        const base = normalizeTitle(data.title)
        if (operation === 'update' && originalDoc?.title === data.title) {
          data.slug = originalDoc.slug
          return data
        }

        // Create par Payload originalDoc ko khali object deta hai — id sirf update par hoti hai
        const selfId = originalDoc?.id

        // Slug globally unique hona chahiye (URL: /p/[slug]); collision par suffix lagao
        let slug = base
        for (let attempt = 1; attempt < 20; attempt++) {
          const existing = await req.payload.find({
            collection: 'playgrounds',
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
      async ({ req, operation, data, originalDoc }) => {
        if (!req.user) return data

        if (operation === 'create') {
          // Non-admin hamesha apna hi owner hoga
          if (!data.owner || req.user.role !== 'admin') data.owner = req.user.id
        } else if (operation === 'update' && req.user.role !== 'admin' && originalDoc) {
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
      admin: {
        readOnly: true,
      },
      access: {
        // Slug sirf beforeValidate hook banata hai (title se) — client direct set nahi kar sakta
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      // Purana theory JSON — Iteration 1 me boards ke canvas data se replace hoga
      name: 'theory',
      type: 'json',
    },
    {
      name: 'forkedFrom',
      type: 'relationship',
      relationTo: 'playgrounds',
      required: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
