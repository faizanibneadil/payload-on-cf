import { type CollectionConfig, ValidationError } from 'payload'
import { normalizeUsername, validateUsername } from '../lib/username'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'role', 'createdAt'],
  },
  auth: {
    loginWithUsername: {
      allowEmailLogin: false,
      requireEmail: false,
    },
  },
  access: {
    // Instructors ko Payload admin panel nahi chahiye — sirf admin role
    admin: ({ req: { user } }) => user?.role === 'admin',
    // Public registration server action se hoti hai (overrideAccess, role hamesha instructor).
    // REST/admin se create sirf admin — ya bilkul pehla user (create-first-user screen).
    create: async ({ req }) => {
      if (!req.user) {
        const count = await req.payload.count({ collection: 'users' })
        return count.totalDocs === 0
      }
      return req.user.role === 'admin'
    },
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        // Username case-insensitive unique hai: hamesha lowercase save karo aur rules server par bhi check karo
        if (data && typeof data.username === 'string') {
          data.username = normalizeUsername(data.username)
          const result = validateUsername(data.username)
          if (result !== true) {
            throw new ValidationError({
              collection: 'users',
              errors: [{ path: 'username', message: result }],
              req,
            })
          }
        }
        return data
      },
    ],
    // User delete se pehle uske boards delete karo (boards.owner NOT NULL hai, warna delete fail hota)
    beforeDelete: [
      async ({ req, id }) => {
        await req.payload.delete({
          collection: 'boards',
          where: { owner: { equals: id } },
          overrideAccess: true,
          req,
        })
      },
    ],
    beforeChange: [
      async ({ req, operation, data }) => {
        if (operation === 'create') {
          const existingUsers = await req.payload.count({ collection: 'users' })
          if (existingUsers.totalDocs === 0) {
            data.role = 'admin'
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Instructor', value: 'instructor' },
      ],
      defaultValue: 'instructor',
      required: true,
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
