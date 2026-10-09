import type { CollectionConfig, PayloadRequest } from 'payload'
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
  endpoints: [
    {
      path: '/:id/files',
      method: 'patch',
      handler: async (req: PayloadRequest) => {
        const { user, payload, routeParams } = req
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const id = routeParams?.id as string
        if (!id) {
          return Response.json({ error: 'Missing playground id' }, { status: 400 })
        }

        const playground = await payload.findByID({
          collection: 'playgrounds',
          id,
          overrideAccess: false,
          req,
        })

        if (!playground) {
          return Response.json({ error: 'Playground not found' }, { status: 404 })
        }

        const isOwner =
          user.role === 'admin' ||
          (typeof playground.owner === 'object'
            ? playground.owner.id === user.id
            : playground.owner === user.id)

        if (!isOwner) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body: any = (await req.json?.().catch(() => ({}))) || {}
        const ops = body.ops as Array<{
          op: 'put' | 'delete' | 'move'
          path: string
          content?: string
          from?: string
          to?: string
        }>

        if (!Array.isArray(ops) || ops.length > 50) {
          return Response.json({ error: 'ops array required and must be <= 50 items' }, { status: 400 })
        }

        const results: Array<{ op: string; path?: string; success: boolean; error?: string }> = []

        for (const op of ops) {
          try {
            if (op.op === 'put') {
              const content = op.content || ''
              const size = new TextEncoder().encode(content).length
              if (size > 512 * 1024) {
                results.push({ op: 'put', path: op.path, success: false, error: 'File size exceeds 512 KB' })
                continue
              }

              const existing = await payload.find({
                collection: 'playground-files',
                where: {
                  and: [{ playground: { equals: id } }, { path: { equals: op.path } }],
                },
                overrideAccess: true,
              })

              if (existing.docs.length > 0) {
                await payload.update({
                  collection: 'playground-files',
                  id: existing.docs[0].id,
                  data: { content, size },
                  overrideAccess: true,
                })
              } else {
                await payload.create({
                  collection: 'playground-files',
                  data: { playground: Number(id), path: op.path, content, size },
                  overrideAccess: true,
                })
              }
              results.push({ op: 'put', path: op.path, success: true })
            } else if (op.op === 'delete') {
              await payload.delete({
                collection: 'playground-files',
                where: {
                  and: [{ playground: { equals: id } }, { path: { equals: op.path } }],
                },
                overrideAccess: true,
              })
              results.push({ op: 'delete', path: op.path, success: true })
            } else if (op.op === 'move' && op.from && op.to) {
              const existing = await payload.find({
                collection: 'playground-files',
                where: {
                  and: [{ playground: { equals: id } }, { path: { equals: op.from } }],
                },
                overrideAccess: true,
              })
              if (existing.docs.length > 0) {
                await payload.update({
                  collection: 'playground-files',
                  id: existing.docs[0].id,
                  data: { path: op.to },
                  overrideAccess: true,
                })
              }
              results.push({ op: 'move', path: op.to, success: true })
            }
          } catch (err: any) {
            results.push({ op: op.op, path: op.path || op.to, success: false, error: err?.message || 'Failed' })
          }
        }

        return Response.json({ results })
      },
    },
    {
      path: '/fork',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const { user, payload } = req
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body: any = (await req.json?.().catch(() => ({}))) || {}
        const playgroundId = body.playgroundId as string
        if (!playgroundId) {
          return Response.json({ error: 'Missing playgroundId' }, { status: 400 })
        }

        const source = await payload.findByID({
          collection: 'playgrounds',
          id: playgroundId,
          overrideAccess: true,
        })

        if (!source) {
          return Response.json({ error: 'Playground not found' }, { status: 404 })
        }

        const baseTitle = `${source.title}-fork`
        let forkTitle = baseTitle.slice(0, 50)
        let slug = normalizeTitle(forkTitle)

        let counter = 1
        while (true) {
          const existing = await payload.find({
            collection: 'playgrounds',
            where: { slug: { equals: slug } },
            overrideAccess: true,
          })
          if (existing.docs.length === 0) break
          forkTitle = `${baseTitle}-${counter}`.slice(0, 50)
          slug = normalizeTitle(forkTitle)
          counter++
        }

        const newPlayground = await payload.create({
          collection: 'playgrounds',
          data: {
            title: forkTitle,
            slug,
            owner: user.id,
            theory: source.theory,
            forkedFrom: source.id,
          },
          overrideAccess: true,
        })

        const sourceFiles = await payload.find({
          collection: 'playground-files',
          where: { playground: { equals: source.id } },
          limit: 300,
          overrideAccess: true,
        })

        for (const file of sourceFiles.docs) {
          await payload.create({
            collection: 'playground-files',
            data: {
              playground: newPlayground.id,
              path: file.path,
              content: file.content,
              size: file.size,
            },
            overrideAccess: true,
          })
        }

        return Response.json({ id: newPlayground.id, slug: newPlayground.slug })
      },
    },
  ],
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
