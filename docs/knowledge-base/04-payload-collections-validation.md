# 04. Collections, unique fields, validation, hooks

Docs: https://payloadcms.com/docs/configuration/collections , https://payloadcms.com/docs/fields/overview , https://payloadcms.com/docs/hooks/overview

## Playgrounds collection sketch
```ts
import type { CollectionConfig } from 'payload'
import { normalizeSlug, validateSlug } from '@/lib/slug'

export const Playgrounds: CollectionConfig = {
  slug: 'playgrounds',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true, unique: true, index: true, maxLength: 50,
      validate: (value) => validateSlug(value as string) },   // returns true | string message
    { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'theory', type: 'richText' },          // editor config: see file 05
    { name: 'files', type: 'json' },               // Vivari FileSystemTree + active file
    { name: 'forkedFrom', type: 'relationship', relationTo: 'playgrounds' },
  ],
  hooks: {
    beforeValidate: [({ data }) => {
      if (data?.title) { data.title = normalizeSlug(data.title); data.slug = data.title }
      return data
    }],
  },
}
```
- `unique: true` creates a DB unique index. **[Docs]** With D1/SQLite this is a real constraint; still catch the duplicate error and return a friendly message.
- `validate` receives `(value, options)` and returns `true` or an error string. **[Docs]**
- Keep `title` and `slug` identical after normalization (simple, one source of truth).
- Schema changes on D1 require a migration (`payload migrate:create`) committed to the repo. See file 06.

## ONE shared slug helper (`lib/slug.ts`)
Used by: the title input (client), the Payload field `validate`/hook, and any API route.
```ts
export const MAX_SLUG = 50
export const normalizeSlug = (v: string) =>
  v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, MAX_SLUG)
export const validateSlug = (v?: string) =>
  !v ? 'Title is required'
  : v.length > MAX_SLUG ? `Max ${MAX_SLUG} characters`
  : !/^[a-z0-9-]+$/.test(v) ? 'Only lowercase letters, numbers and hyphens'
  : true
```
Decide and document how to treat consecutive/leading/trailing hyphens (suggest: allow while typing, trim on save).
Fallback when empty on Save: `untitled-<short-random-id>`.

## Availability check
Only on Save. Endpoint: a route handler or Payload `find` with `where: { slug: { equals } }` excluding the current document id. The DB unique index is the final authority (handles races).
