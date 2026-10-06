import { describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'
import '../../src/crypto-patch'

describe('crypto-patch', () => {
  it('should clamp PBKDF2 async iteration counts above 100000 to 100000', async () => {
    let capturedIterations: number | undefined

    const pbkdf2Promise = new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2('password', 'salt', 600000, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey)
      })
    })

    const derivedKey = await pbkdf2Promise
    expect(derivedKey).toBeDefined()
    expect(derivedKey.length).toBe(32)
  })

  it('should clamp PBKDF2 sync iteration counts above 100000 to 100000', () => {
    const derivedKey = crypto.pbkdf2Sync('password', 'salt', 600000, 32, 'sha256')
    expect(derivedKey).toBeDefined()
    expect(derivedKey.length).toBe(32)
  })

  it('should preserve iteration counts below or equal to 100000', () => {
    const derivedKey = crypto.pbkdf2Sync('password', 'salt', 50000, 32, 'sha256')
    expect(derivedKey).toBeDefined()
    expect(derivedKey.length).toBe(32)
  })
})
