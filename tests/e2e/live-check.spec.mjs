// Wahi live-check jo CI deploy ke baad chalata hai (`scripts/live-check.mjs`), yahan local build par
import { spawnSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { BASE } from './base.mjs'
import { freshServerPerFile } from './server.mjs'

freshServerPerFile()

test('Live check: register, board, sign out, refreshes, sign in', async ({
  browserName,
}, testInfo) => {
  const run = spawnSync('node', ['scripts/live-check.mjs', BASE], {
    encoding: 'utf8',
    env: { ...process.env, CHROMIUM_PATH: process.env.CHROMIUM_PATH ?? '' },
  })
  const log = `${run.stdout}\n${run.stderr}`
  await testInfo.attach('live-check.log', { body: log, contentType: 'text/plain' })
  for (const line of log.split('\n').filter((l) => /^(PASS|FAIL) /.test(l))) {
    testInfo.annotations.push({
      type: line.startsWith('PASS') ? 'pass' : 'FAIL',
      description: line.slice(5),
    })
  }
  expect(
    run.status,
    log
      .split('\n')
      .filter((l) => l.startsWith('FAIL'))
      .join('\n'),
  ).toBe(0)
})
