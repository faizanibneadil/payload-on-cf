import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    try {
      const payloadConfig = await config
      payload = await getPayload({ config: payloadConfig })
    } catch {
      // D1 proxy omitted in isolated test environment
    }
  })

  it('loads payload config with playgrounds and users collections', async () => {
    const payloadConfig = await config
    expect(payloadConfig.collections.map((c) => c.slug)).toContain('playgrounds')
    expect(payloadConfig.collections.map((c) => c.slug)).toContain('users')
  })
})
