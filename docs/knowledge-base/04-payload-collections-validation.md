# 04. Collections, unique fields, validation, hooks

Docs: https://payloadcms.com/docs/configuration/collections , https://payloadcms.com/docs/fields/overview , https://payloadcms.com/docs/hooks/overview

## Collections (current)
- `playgrounds`: `title` (max 50, normalized), `slug` (unique, generated in `beforeValidate`, collision gets a random suffix), `owner` (relationship, pinned server-side in `beforeChange`), `theory` (json), `forkedFrom` (relationship). `afterDelete` removes the playground's files.
- `playground-files`: `playground` (relationship), `name`, `type` (`file` | `folder`), `content`, `size`. `parent` and `breadcrumbs` come from `@payloadcms/plugin-nested-docs`. Hooks enforce unique sibling names, no cycles, max depth, max nodes per playground and max file size (see `src/lib/file-rules.ts`).
- `users`: username + password, `role` (`admin` | `user`, saved to the JWT).

- `unique: true` creates a DB unique index. With D1/SQLite this is a real constraint; still catch the duplicate error and return a friendly message.
- `validate` receives `(value, options)` and returns `true` or an error string.
- Schema changes on D1 require a migration (`pnpm payload migrate:create`) committed to the repo. See file 06.

## ONE shared slug helper (`src/lib/title-slug.ts`)
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
