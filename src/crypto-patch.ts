import crypto from 'node:crypto'

// Cloudflare Workers' node:crypto implementation restricts PBKDF2 iterations to a maximum of 100,000.
// Payload CMS uses 600,000 iterations by default for password hashing, causing a NotSupportedError on Workers.
// This patch clamps PBKDF2 iteration counts to 100,000 to ensure compatibility with Cloudflare Workers.

const MAX_PBKDF2_ITERATIONS = 100000

if (crypto && typeof crypto.pbkdf2 === 'function') {
  const originalPbkdf2 = crypto.pbkdf2
  // @ts-ignore
  crypto.pbkdf2 = function (...args: any[]) {
    if (typeof args[2] === 'number' && args[2] > MAX_PBKDF2_ITERATIONS) {
      args[2] = MAX_PBKDF2_ITERATIONS
    }
    return (originalPbkdf2 as any).apply(this, args)
  }
}

if (crypto && typeof crypto.pbkdf2Sync === 'function') {
  const originalPbkdf2Sync = crypto.pbkdf2Sync
  // @ts-ignore
  crypto.pbkdf2Sync = function (...args: any[]) {
    if (typeof args[2] === 'number' && args[2] > MAX_PBKDF2_ITERATIONS) {
      args[2] = MAX_PBKDF2_ITERATIONS
    }
    return (originalPbkdf2Sync as any).apply(this, args)
  }
}
