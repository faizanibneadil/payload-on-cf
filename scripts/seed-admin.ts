/**
 * Default admin user banata hai — sirf tab jab database me koi admin maujood na ho.
 * CI/CD me migrations ke baad chalta hai (`pnpm deploy:seed`); dobara chalane par kuch nahi badalta.
 *
 * Credentials: ADMIN_USERNAME / ADMIN_PASSWORD env (default: admin / admin).
 * Deploy ke baad /admin me ja kar password foran badal dein.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const username = (process.env.ADMIN_USERNAME || 'admin').trim()
const password = process.env.ADMIN_PASSWORD || 'admin'

async function seedAdmin(): Promise<void> {
  const payload = await getPayload({ config })

  const admins = await payload.count({
    collection: 'users',
    where: { role: { equals: 'admin' } },
    overrideAccess: true,
  })
  if (admins.totalDocs > 0) {
    console.log('[seed-admin] An admin already exists — nothing to do.')
    return
  }

  const taken = await payload.count({
    collection: 'users',
    where: { username: { equals: username } },
    overrideAccess: true,
  })
  if (taken.totalDocs > 0) {
    // Kisi student ke account ko chup-chaap admin nahi banate
    console.warn(
      `[seed-admin] No admin exists, but the username "${username}" is taken by a non-admin user. Set ADMIN_USERNAME to another name and redeploy.`,
    )
    return
  }

  await payload.create({
    collection: 'users',
    data: { username, password, role: 'admin' },
    overrideAccess: true,
  })
  console.log(`[seed-admin] Created admin user "${username}".`)
}

// `payload run` script import hone tak hi intezar karta hai — isliye top-level await zaroori hai
try {
  await seedAdmin()
} catch (error) {
  console.error('[seed-admin] Failed:', error)
  process.exit(1)
}
