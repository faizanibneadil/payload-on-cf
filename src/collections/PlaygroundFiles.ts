import type { CollectionConfig } from 'payload'

export const PlaygroundFiles: CollectionConfig = {
  slug: 'playground-files',
  admin: {
    useAsTitle: 'path',
    defaultColumns: ['playground', 'path', 'size', 'createdAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'playground',
      type: 'relationship',
      relationTo: 'playgrounds',
      required: true,
      index: true,
    },
    {
      name: 'path',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'content',
      type: 'textarea',
      required: false,
    },
    {
      name: 'size',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
}
