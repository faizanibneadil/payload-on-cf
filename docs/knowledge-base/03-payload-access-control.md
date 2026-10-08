# 03. Payload access control

Official docs: https://payloadcms.com/docs/access-control/overview

## Concepts **[Docs]**
- Collection-level access: `create`, `read`, `update`, `delete` (plus `admin`, `unlock`, `readVersions` as applicable).
- An access function returns `true`, `false`, or a **query constraint** (a `Where` object) that limits which documents match.
- `req.user` is the authenticated user (or null).
- Field-level access exists too (`access: { create, read, update }` on a field).
- Local API calls bypass access control by default (`overrideAccess: true`). In server code that acts on behalf of a user, pass `overrideAccess: false` and `user`.

## Admin panel gotcha (important)
`access.admin` on the auth collection decides who may enter the admin panel. The brief says users log in via the official admin login screen, so **regular users must pass `access.admin`**, otherwise they log in and land on an unauthorized page. Therefore:
- `access.admin: ({ req }) => Boolean(req.user)` on `users`
- Hide everything they must not manage: `admin.hidden` on collections (function receiving `{ user }`) and strict collection access so they cannot read/update others. **[Verify `admin.hidden` signature]**

## Suggested rules
```ts
const isAdmin = ({ req }) => req.user?.role === 'admin'
const isLoggedIn = ({ req }) => Boolean(req.user)

// users
access: {
  admin: isLoggedIn,
  create: isAdmin,                       // no public registration
  read: ({ req }) =>
    req.user?.role === 'admin' ? true : req.user ? { id: { equals: req.user.id } } : false,
  update: ({ req }) =>
    req.user?.role === 'admin' ? true : req.user ? { id: { equals: req.user.id } } : false,
  delete: isAdmin,
}

// playgrounds
access: {
  read: () => true,                      // public
  create: isLoggedIn,
  update: ({ req }) =>
    req.user?.role === 'admin' ? true : req.user ? { owner: { equals: req.user.id } } : false,
  delete: ({ req }) =>
    req.user?.role === 'admin' ? true : req.user ? { owner: { equals: req.user.id } } : false,
}
```

## Showing the owner's name publicly
Anonymous visitors cannot read `users` with the rules above. To display the owner username on `/p/[slug]`, fetch it in server code and return only the username (not the whole user), or store a denormalized `ownerUsername` text field set by a hook. Never open `users` read to the public.

## Forcing `owner` server-side
Do not trust the client. Use a `beforeChange` hook (on create) that sets `data.owner = req.user.id`, and block changes to `owner` on update for non-admins (field-level `access.update`).
