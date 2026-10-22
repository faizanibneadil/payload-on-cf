import { execFileSync } from 'node:child_process'
import { test } from '@playwright/test'

/** `tests/e2e/server.sh` chalao; fail ho to uska output error me aata hai */
export function server(command) {
  execFileSync('bash', ['tests/e2e/server.sh', command], { stdio: 'inherit' })
}

/**
 * Har spec file apne saaf local database par chalti hai (suites ek jaise usernames use karti hain).
 * BASE_URL diya ho (koi aur server) to kuch reset nahi hota.
 */
export function freshServerPerFile() {
  test.beforeAll(() => {
    test.setTimeout(180_000)
    if (!process.env.BASE_URL) server('start-fresh')
  })
}
