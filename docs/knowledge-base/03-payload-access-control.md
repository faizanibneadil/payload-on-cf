# 03. Payload access control

Official docs: https://payloadcms.com/docs/access-control/overview

## Concepts **[Docs]**
- Collection-level access: `create`, `read`, `update`, `delete` (plus `admin`, `unlock`, `readVersions` as applicable).
- An access function returns `true`, `false`, or a **query constraint** (a `Where` object) that limits which documents match.
- `req.user` is the authenticated user (or null).
- Field-level access exists too (`access: { create, read, update }` on a field).
- Local API calls bypass access control by default (`overrideAccess: true`). In server code that acts on behalf of a user, pass `overrideAccess: false` and `user`.

## Admin panel gotcha (important)
`access.admin` on the auth collection decides who may enter the admin panel. Students and teachers sign in through the header modal and never use the Payload admin, so `access.admin` on `users` allows the `admin` role (super admin) only.

## Rules (target, built in Iteration 1 and 2)
```ts
const isAdmin = ({ req }) => req.user?.role === 'admin'
const isLoggedIn = ({ req }) => Boolean(req.user)

// users
access: {
  admin: isAdmin,
  create: isAdmin,        // registration runs in a server action (overrideAccess) that validates the username and password
  read: ({ req }) => (isAdmin({ req }) ? true : req.user ? { id: { equals: req.user.id } } : false),
  update: ({ req }) => (isAdmin({ req }) ? true : req.user ? { id: { equals: req.user.id } } : false),
  delete: isAdmin,
}

// playgrounds
access: {
  read: ({ req }) => {
    if (req.user?.role === 'admin') return true
    // owner apni sab playgrounds dekhta hai; baqi sirf shared (link wali) playgrounds
    return req.user
      ? { or: [{ owner: { equals: req.user.id } }, { isShared: { equals: true } }] }
      : { isShared: { equals: true } }
  },
  create: isLoggedIn,     // rate limit beforeValidate hook me (admin exempt)
  update: ({ req }) => (isAdmin({ req }) ? true : req.user ? { owner: { equals: req.user.id } } : false),
  delete: ({ req }) => (isAdmin({ req }) ? true : req.user ? { owner: { equals: req.user.id } } : false),
}
```

- `owner` is set server-side in `beforeChange` (non-admins can never set or change it).
- `isShared` can only be changed by the owner or admin (it is part of the owner-only `update`).
- Counters (`saveCount`, `saveWindowStartedAt`) and `slug` are written only by hooks; field-level `update` access is admin only.
- Limits (playgrounds per window, saves per playground per window, max content size) come from the `settings` Global. `admin` bypasses them and its counters are not touched.
- Visitors never save: there is no write path for non-owners. Their edits live only in their browser.
- Never trust UI checks. Every permission above is enforced in Payload.

## `settings` Global
- `read`: admin panel and server code only (server code uses `overrideAccess`). `update`: admin only.
- Fields: window hours (24), max playgrounds per window (10), max saves per playground per window (10), max content bytes (1.8 MB default, hard ceiling in code below the D1 row limit).
- The server caches the Global in Worker memory for a few seconds and clears the cache in its `afterChange` hook, so a Save does not cost a D1 read for the limits.
