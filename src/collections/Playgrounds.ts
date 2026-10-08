import type { CollectionConfig } from 'payload'
import { normalizeTitle, validateTitle } from '../lib/title-slug'

export const Playgrounds: CollectionConfig = {
  slug: 'playgrounds',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'owner', 'createdAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { owner: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { owner: { equals: user.id } }
    },
  },
  hooks: {
    beforeValidate: [
      async ({ data }) => {
        if (data && data.title) {
          data.slug = normalizeTitle(data.title)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ req, operation, data, originalDoc }) => {
        if (!req.user) return data

        if (operation === 'create') {
          if (!data.owner) {
            data.owner = req.user.id
          }
        } else if (operation === 'update') {
          if (req.user.role !== 'admin' && originalDoc) {
            data.owner = originalDoc.owner
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
      unique: true,
      index: true,
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
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'theory',
      type: 'richText',
    },
    {
      name: 'files',
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
