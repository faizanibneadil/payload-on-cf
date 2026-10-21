# 02. Payload auth: username + password only

Official docs: https://payloadcms.com/docs/authentication/overview (section "Login with Username")

## Correct config key
The option is `auth.loginWithUsername` (NOT `loginWithUsernameAndPassword`). **[Docs]**

```ts
// collections/Users.ts
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    loginWithUsername: {
      allowEmailLogin: false, // default false: login by username only
      requireEmail: false,    // default false: email not required
    },
  },
  fields: [
    // Payload adds the `username` field automatically when loginWithUsername is set.
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'instructor'],
      defaultValue: 'instructor',
      required: true,
      saveToJWT: true, // lets access functions read req.user.role without an extra DB call
    },
  ],
}
```

## Notes
- `loginWithUsername: true` also works and uses defaults. The object form is explicit and preferred. **[Docs]**
- With `requireEmail: false` and `allowEmailLogin: false`, users are created with username + password only. **[Docs]**
- **Registration is public**: anyone can register from the header modal, and the new user always gets the role `instructor`. The REST `create` stays admin-only; the Register server action validates the input and creates the user with `overrideAccess` and a fixed role (the client can never choose the role).
- The first user on a fresh database becomes `admin` (existing `beforeChange` hook). CI also seeds an admin if none exists (`scripts/seed-admin.ts`).
- Password reset / email verification need email config; keep them disabled/unused.
- Local API login (server code): `payload.login({ collection: 'users', data: { username, password } })`. **[Verify]**
- The Payload admin login at `/admin/login` stays for the super admin.

## Reading the current user in Next.js server code
```ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

const payload = await getPayload({ config })
const { user } = await payload.auth({ headers: await getHeaders() })
```
**[Docs/Verify]** (`payload.auth` is the documented way to resolve the user from request headers.)

## Username rules and screens (target, Iteration 1)
- Allowed: `a-z`, `0-9`, `_`; length 3-20; numeric-only usernames are valid; case-insensitive and unique (lowercase before saving). `admin` is reserved. Password: at least 8 characters.
- Validate on the client and on the server (field `validate` and the registration server action).
- Sign in and Register live in one modal (two tabs) opened from the header. There are no `/login` or `/register` pages.
- Migration: existing users with role `user` become `instructor`.
