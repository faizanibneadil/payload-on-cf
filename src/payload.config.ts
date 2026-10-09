import './crypto-patch'
import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Playgrounds } from './collections/Playgrounds'
import { PlaygroundFiles } from './collections/PlaygroundFiles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => {
  try {
    return fs.existsSync(value) ? fs.realpathSync(value) : undefined
  } catch {
    return undefined
  }
}

const isCLI =
  Boolean(process.env.NEXT_PHASE) ||
  process.argv.some((value) => {
    const resolved = realpath(value)
    if (!resolved) return false
    return (
      resolved.endsWith(path.join('payload', 'bin.js')) ||
      resolved.endsWith(path.join('next', 'dist', 'bin', 'next')) ||
      resolved.includes(path.join('next', 'dist'))
    )
  })
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

const env = {
  ...process.env,
  ...(cloudflare?.env as unknown as Record<string, string | undefined>),
}

const cloudflareLogger = {
  level: env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any // Use PayloadLogger type when it's exported

const smtpHost = env.SMTP_HOST || 'smtp.gmail.com'
const smtpPort = env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587
const smtpUser = env.SMTP_USER
const smtpPass = env.SMTP_PASS
const smtpFromAddress = env.SMTP_FROM_ADDRESS || 'noreply@example.com'
const smtpFromName = env.SMTP_FROM_NAME || 'Payload CMS'
const payloadSecret = env.PAYLOAD_SECRET || 'fallback-secret-for-local-dev-only'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeLogin: ['@/components/payload-auth-custom#BeforeLoginComponent'],
      afterLogin: ['@/components/payload-auth-custom#AfterLoginComponent'],
    },
  },
  collections: [Users, Media, Playgrounds, PlaygroundFiles],
  editor: lexicalEditor(),
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({
    binding: cloudflare.env.D1,
  }),
  logger: isProduction ? cloudflareLogger : undefined,
  email: smtpUser && smtpPass
    ? nodemailerAdapter({
        defaultFromAddress: smtpFromAddress,
        defaultFromName: smtpFromName,
        transportOptions: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        } as any,
      })
    : undefined,
  onInit: async (payload) => {
    if (smtpUser && smtpPass) {
      try {
        await payload.sendEmail({
          to: 'faizanibneadil1@gmail.com',
          subject: 'Cloudflare deployments status: SUCCESS',
          text: 'Cloudflare deployment is successful so u can use the project.',
        })
      } catch (err) {
        console.warn('Failed to send startup email:', err)
      }
    }
  },
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
async function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  try {
    const { getPlatformProxy } = await import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`)
    return await getPlatformProxy({
      environment: process.env.CLOUDFLARE_ENV,
      remoteBindings: isProduction && Boolean(process.env.CLOUDFLARE_API_TOKEN),
    } satisfies GetPlatformProxyOptions)
  } catch (error) {
    console.warn('Wrangler proxy init failed or unavailable, using fallback Cloudflare context for CLI:', error)
    return {
      env: {
        D1: {} as any,
        R2: {} as any,
      },
      cf: {} as any,
      ctx: {} as any,
      caches: {} as any,
    } as unknown as CloudflareContext
  }
}
