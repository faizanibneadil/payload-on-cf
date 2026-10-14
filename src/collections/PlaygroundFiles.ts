import type { CollectionConfig, Where } from 'payload'
import {
  byteLength,
  MAX_DEPTH,
  MAX_FILE_BYTES,
  MAX_NODES_PER_PLAYGROUND,
  validateNodeName,
} from '../lib/file-rules'

const relId = (value: unknown): number | string | undefined => {
  if (value && typeof value === 'object') return (value as { id: number | string }).id
  return (value as number | string | undefined) ?? undefined
}

/**
 * Playground ke files aur folders. Tree structure `@payloadcms/plugin-nested-docs`
 * se aata hai (parent + breadcrumbs fields plugin inject karta hai).
 * Permissions yahin server par enforce hoti hain — UI par depend nahi karte.
 */
export const PlaygroundFiles: CollectionConfig = {
  slug: 'playground-files',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'playground', 'parent', 'size'],
  },
  access: {
    // Shared playground sab ke liye read-only open hota hai
    read: () => true,
    // Create: sirf us playground ka owner (ya admin)
    create: async ({ req: { user, payload }, data }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      const playgroundId = relId(data?.playground)
      if (!playgroundId) return false
      try {
        const playground = await payload.findByID({
          collection: 'playgrounds',
          id: playgroundId,
          depth: 0,
          overrideAccess: true,
        })
        return relId(playground.owner) === user.id
      } catch {
        return false
      }
    },
    update: ({ req: { user } }): boolean | Where => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { 'playground.owner': { equals: user.id } }
    },
    delete: ({ req: { user } }): boolean | Where => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { 'playground.owner': { equals: user.id } }
    },
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (typeof data.name === 'string') data.name = data.name.trim()
        if (data.type !== undefined && data.type !== 'folder') data.type = 'file'
        if (data.type === 'folder') {
          data.content = ''
          data.size = 0
        } else if ('content' in data) {
          data.size = byteLength(data.content)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        const playgroundId = relId(data.playground ?? originalDoc?.playground)
        const parentId = relId(
          data.parent ?? (data.parent === undefined ? originalDoc?.parent : null),
        )
        const name = data.name ?? originalDoc?.name

        // Sibling names unique hone chahiye (ek folder me do same-name files nahi)
        const siblings = await req.payload.find({
          collection: 'playground-files',
          where: {
            and: [
              { playground: { equals: playgroundId } },
              parentId ? { parent: { equals: parentId } } : { parent: { exists: false } },
              { name: { equals: name } },
              ...(operation === 'update' && originalDoc
                ? [{ id: { not_equals: originalDoc.id } }]
                : []),
            ],
          },
          limit: 1,
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        })
        if (siblings.docs.length > 0) {
          throw new Error(`"${name}" already exists in this folder`)
        }

        // Folder ko apni hi sub-tree me move karna (cycle) rokna + depth limit
        if (parentId) {
          let depth = 1
          let cursor: number | string | undefined = parentId
          while (cursor) {
            if (originalDoc && String(cursor) === String(originalDoc.id)) {
              throw new Error('A folder cannot be moved into itself')
            }
            const ancestor = await req.payload.findByID({
              collection: 'playground-files',
              id: cursor,
              depth: 0,
              overrideAccess: true,
              req,
            })
            if (ancestor.type !== 'folder') throw new Error('Parent must be a folder')
            cursor = relId(ancestor.parent)
            depth++
            if (depth > MAX_DEPTH)
              throw new Error(`Folders can be nested at most ${MAX_DEPTH} levels`)
          }
        }

        if (operation === 'create') {
          const count = await req.payload.count({
            collection: 'playground-files',
            where: { playground: { equals: playgroundId } },
            overrideAccess: true,
            req,
          })
          if (count.totalDocs >= MAX_NODES_PER_PLAYGROUND) {
            throw new Error(
              `A playground can hold at most ${MAX_NODES_PER_PLAYGROUND} files and folders`,
            )
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'playground',
      type: 'relationship',
      relationTo: 'playgrounds',
      required: true,
      index: true,
      access: {
        // File ko kisi doosre (victim) playground me move karna rokna — sirf admin badal sakta hai
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      validate: (value: unknown) => validateNodeName(value),
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'file',
      index: true,
      options: [
        { label: 'File', value: 'file' },
        { label: 'Folder', value: 'folder' },
      ],
    },
    {
      name: 'content',
      type: 'textarea',
      validate: (value: unknown) =>
        byteLength(value as string) > MAX_FILE_BYTES
          ? `File size exceeds ${MAX_FILE_BYTES / 1024} KB`
          : true,
    },
    {
      name: 'size',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { readOnly: true },
      access: {
        // size hamesha server hook se calculate hota hai, client se set nahi hota
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
