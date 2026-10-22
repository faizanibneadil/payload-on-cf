import { getCloudflareContext } from '@opennextjs/cloudflare'

// payload.config bhi yahi fallback use karta hai (sirf local dev, production me secret zaroori hai)
export const DEV_FALLBACK_SECRET = 'fallback-secret-for-local-dev-only'

export interface RuntimeEnv {
  D1: D1Database
  payloadSecret: string
}

/**
 * Worker bindings (D1) aur secret — Payload ko load kiye baghair. Production me Cloudflare context;
 * dev me Payload wala wrangler proxy (do proxies ek hi local DB par na khulen).
 */
export async function getRuntimeEnv(): Promise<RuntimeEnv> {
  if (process.env.NODE_ENV === 'production') {
    const { env } = await getCloudflareContext({ async: true })
    const vars = env as unknown as { D1: D1Database; PAYLOAD_SECRET?: string }
    return { D1: vars.D1, payloadSecret: vars.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET || '' }
  }
  const { devCloudflareEnv } = await import('@/payload.config')
  return {
    D1: (devCloudflareEnv as unknown as { D1: D1Database }).D1,
    payloadSecret: process.env.PAYLOAD_SECRET || DEV_FALLBACK_SECRET,
  }
}
