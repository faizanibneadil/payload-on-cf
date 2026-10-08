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
      options: ['admin', 'user'],
      defaultValue: 'user',
      required: true,
      saveToJWT: true, // lets access functions read req.user.role without an extra DB call [Verify]
    },
  ],
}
```

## Notes
- `loginWithUsername: true` also works and uses defaults. The object form is explicit and preferred. **[Docs]**
- With `requireEmail: false` and `allowEmailLogin: false`, admins create users with username + password only. **[Docs]**
- No public registration: lock `create` (see file 03). Users are created in the admin dashboard.
- The first user on a fresh database is created through Payload's "create first user" screen. Make sure that first user can be given the `admin` role (field-level access must not block it). **[Verify]**
- Password reset / email verification need email config; keep them disabled/unused (no email transport).
- Local API login (server code): `payload.login({ collection: 'users', data: { username, password } })`. **[Verify]**
- After login via `/admin/login`, a redirect back to the app is possible with the `redirect` query parameter, e.g. `/admin/login?redirect=/`. **[Verify] test that it works**

## Reading the current user in Next.js server code
```ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

const payload = await getPayload({ config })
const { user } = await payload.auth({ headers: await getHeaders() })
```
**[Docs/Verify]** (`payload.auth` is the documented way to resolve the user from request headers.)
