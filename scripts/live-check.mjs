/**
 * Live check: deploy ke baad asal URL par Chromium se poora user flow chalata hai
 * (register, board, sign out, hard refresh, cancel karke refresh, sign in) aur har qadam ka
 * time, HTTP errors aur console errors log karta hai. Screenshots `live-check-output/` me.
 *
 * Usage: node scripts/live-check.mjs https://<worker>.workers.dev
 * Har run ek naya `livecheck_<id>` account banata hai aur aakhir me apna board delete karta hai.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const BASE = (process.argv[2] || process.env.LIVE_URL || '').replace(/\/$/, '')
if (!BASE) {
  console.error('Usage: node scripts/live-check.mjs <base-url>')
  process.exit(2)
}
const OUT = 'live-check-output'
const STEP_LIMIT_MS = 15_000
mkdirSync(OUT, { recursive: true })

const results = []
const log = []
let shotNo = 0

const record = (line) => {
  log.push(line)
  console.log(line)
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
// Payload csrf: test ki API calls bhi browser ki tarah Origin bhejen, warna login cookie nahi mana jata
for (const m of ['get', 'post', 'patch', 'delete']) {
  const orig = page.request[m].bind(page.request)
  page.request[m] = (url, o = {}) => orig(url, { ...o, headers: { Origin: BASE, ...o.headers } })
}
page.setDefaultTimeout(STEP_LIMIT_MS)
page.on('console', (m) => {
  if (m.type() === 'error') record(`  console.error ${page.url()} :: ${m.text().slice(0, 300)}`)
})
page.on('pageerror', (e) => record(`  pageerror ${page.url()} :: ${String(e).slice(0, 300)}`))
page.on('framenavigated', (frame) => {
  if (frame === page.mainFrame()) record(`  navigated ${frame.url()}`)
})
page.on('response', (r) => {
  // Server actions (POST) ka status hamesha log karo — fail hone par wajah samajhne ke liye
  if (r.request().method() === 'POST') {
    record(`  post ${r.status()} ${r.url()} ray=${r.headers()['cf-ray'] ?? '-'}`)
  } else if (r.status() >= 400) {
    record(
      `  http ${r.status()} ${r.request().method()} ${r.url()} ray=${r.headers()['cf-ray'] ?? '-'}`,
    )
  }
})
page.on('requestfailed', (r) =>
  record(`  requestfailed ${r.method()} ${r.url()} :: ${r.failure()?.errorText}`),
)

async function shot(name) {
  shotNo += 1
  await page
    .screenshot({ path: `${OUT}/${String(shotNo).padStart(2, '0')}-${name}.png` })
    .catch(() => {})
}

async function step(name, fn) {
  const start = Date.now()
  try {
    await fn()
    const ms = Date.now() - start
    const ok = ms <= STEP_LIMIT_MS
    results.push({ name, ok, ms })
    record(`${ok ? 'PASS' : 'SLOW'} ${name} (${ms} ms)`)
  } catch (err) {
    const ms = Date.now() - start
    results.push({ name, ok: false, ms, error: String(err).split('\n')[0] })
    record(`FAIL ${name} (${ms} ms) ${String(err).split('\n')[0]}`)
    // Fail hone par page ki haalat log me (artifact ke baghair bhi wajah dikhe)
    const toasts = await page
      .locator('[data-sonner-toast]')
      .allInnerTexts()
      .catch(() => [])
    const text = await page
      .evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400))
      .catch(() => '')
    record(`  url: ${page.url()}`)
    record(`  toasts: ${JSON.stringify(toasts)}`)
    record(`  page text: ${text}`)
  }
  await shot(name.replace(/[^a-z0-9]+/gi, '-').toLowerCase())
}

// Hydration se pehle click zaya ho sakta hai — dialog nazar aane tak dobara click
async function openAuth(testId) {
  for (let i = 0; i < 20; i++) {
    await page.getByTestId(testId).click()
    if (
      await page
        .getByTestId('auth-dialog')
        .isVisible()
        .catch(() => false)
    )
      return
    await page.waitForTimeout(500)
  }
  throw new Error(`auth dialog did not open via ${testId}`)
}

const id = `${Date.now().toString(36)}`.slice(-8)
const username = `livecheck_${id}`
const password = `pw-${id}-check`
let boardPath = ''

await step('open home', () => page.goto(BASE, { waitUntil: 'networkidle' }))

await step('register', async () => {
  await openAuth('intro-register')
  const form = page.getByTestId('register-form')
  await form.getByLabel('Username').fill(username)
  await form.getByLabel('Password', { exact: true }).fill(password)
  await form.getByLabel('Confirm password').fill(password)
  await form.getByRole('button', { name: 'Create account' }).click()
  await page.getByTestId('user-menu-trigger').waitFor()
})

await step('create board', async () => {
  await page.getByRole('button', { name: 'New board' }).first().click()
  const dialog = page.getByTestId('new-board-dialog')
  await dialog.getByLabel('Title').fill(`Live check ${id}`)
  await dialog.getByRole('button', { name: 'Create board' }).click()
  await page.waitForURL(/\/b\//)
  await page.getByTestId('board-title-input').waitFor()
  boardPath = new URL(page.url()).pathname
})

await step('hard refresh on board (signed in)', async () => {
  await page.reload({ waitUntil: 'load' })
  await page.getByTestId('board-title-input').waitFor()
})

await step('rename and save', async () => {
  await page.getByTestId('board-title-input').fill(`Live check ${id} saved`)
  await page.getByTestId('unsaved-indicator').waitFor()
  await page.getByTestId('save-button').click()
  await page.locator('[data-sonner-toast]', { hasText: 'Saved' }).waitFor()
  await page.getByTestId('unsaved-indicator').waitFor({ state: 'detached' })
})

// Bina cookie ke request = signed-out visitor
const visitorStatus = async () =>
  (await fetch(`${BASE}${boardPath}`, { signal: AbortSignal.timeout(STEP_LIMIT_MS) })).status

async function setShare(on) {
  if (
    !(await page
      .getByTestId('share-popover')
      .isVisible()
      .catch(() => false))
  ) {
    await page.getByTestId('share-button').click()
    await page.getByTestId('share-popover').waitFor()
  }
  await page.getByTestId('share-switch').click()
  // Server ka jawab aane tak (switch optimistic hai) — status poll karo
  for (let i = 0; i < 40; i++) {
    if ((await visitorStatus()) === (on ? 200 : 404)) return
    await page.waitForTimeout(250)
  }
  throw new Error(`visitor did not get ${on ? 200 : 404} after share ${on ? 'on' : 'off'}`)
}

await step('canvas: add markdown block, save, reload', async () => {
  await page.getByTestId('canvas-surface').dblclick({ position: { x: 400, y: 250 } })
  await page.getByTestId('text-editor').waitFor()
  await page.keyboard.type('# ')
  await page.keyboard.type('Live heading')
  await page.keyboard.press('Enter')
  await page.keyboard.type('- ')
  await page.keyboard.type('point')
  await page.keyboard.press('Escape')
  await page.getByTestId('unsaved-indicator').waitFor()
  await page.getByTestId('save-button').click()
  // Pichle step ka "Saved" toast abhi dikh sakta hai; isliye unsaved nishan hatne ka intezar
  // karo (wo sirf kamyab save ke baad hatta hai), warna reload chalti save ko kaat deta hai
  await page.getByTestId('unsaved-indicator').waitFor({ state: 'detached' })
  await page.reload({ waitUntil: 'load' })
  const block = page.getByTestId('text-block').first()
  await block.waitFor()
  // Block ke andar har element ka tag (h1, ul, ...)
  const types = await block.evaluate((el) =>
    Array.from(el.querySelector('.md-lines')?.children ?? []).map((c) => c.tagName.toLowerCase()),
  )
  if (types.join(',') !== 'h1,ul')
    throw new Error(`unexpected lines after reload: ${types.join(',')}`)
})

await step('share on: visitor can open the link', () => setShare(true))
await step('share off: visitor gets 404', async () => {
  await setShare(false)
  await page.keyboard.press('Escape')
})

await step('sign out from board page', async () => {
  await page.getByTestId('user-menu-trigger').click()
  await page.getByTestId('logout').click()
  await page.getByTestId('header-signin').waitFor()
})
record(`  url after sign out: ${page.url()}`)

for (let i = 1; i <= 3; i++) {
  await step(`hard refresh ${i} after sign out`, async () => {
    await page.reload({ waitUntil: 'load' })
    await page.getByTestId('header-signin').waitFor()
  })
}

await step('private board signed out = 404 page', async () => {
  const res = await page.goto(`${BASE}${boardPath}`, { waitUntil: 'load' })
  if (res?.status() !== 404) throw new Error(`expected 404, got ${res?.status()}`)
  await page.getByText('Not found').waitFor()
})

// Aadha load hua refresh cancel karna, phir dobara refresh (owner ka reported scenario)
await step('cancelled refresh then refresh again', async () => {
  await page.goto(BASE, { waitUntil: 'commit' }).catch(() => {})
  await page.evaluate(() => window.stop()).catch(() => {})
  await page.reload({ waitUntil: 'load' })
  await page.getByTestId('header-signin').waitFor()
})

await step('raw requests with aborted predecessors', async () => {
  for (let i = 0; i < 5; i++) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 150)
    await fetch(`${BASE}/?abort=${i}`, { signal: controller.signal }).catch(() => {})
    const start = Date.now()
    const res = await fetch(`${BASE}/?after-abort=${i}`, {
      signal: AbortSignal.timeout(STEP_LIMIT_MS),
    })
    record(
      `  after abort ${i}: HTTP ${res.status} in ${Date.now() - start} ms ray=${res.headers.get('cf-ray')}`,
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }
})

await step('sign in again', async () => {
  await openAuth('header-signin')
  const form = page.getByTestId('signin-form')
  await form.getByLabel('Username').fill(username)
  await form.getByLabel('Password').fill(password)
  await form.getByRole('button', { name: 'Sign in' }).click()
  await page.getByTestId('user-menu-trigger').waitFor()
})

await step('delete test board (cleanup)', async () => {
  const slug = boardPath.split('/').pop()
  const found = await (
    await page.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const boardId = found.docs?.[0]?.id
  if (!boardId) throw new Error('test board not found')
  const res = await page.request.delete(`${BASE}/api/boards/${boardId}`)
  if (!res.ok()) throw new Error(`delete failed: HTTP ${res.status()}`)
})

await browser.close()

const failed = results.filter((r) => !r.ok)
record(
  `\n${results.length - failed.length}/${results.length} steps passed (limit ${STEP_LIMIT_MS} ms per step)`,
)
writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, username, results }, null, 2))
writeFileSync(`${OUT}/log.txt`, `${log.join('\n')}\n`)
process.exit(failed.length ? 1 : 0)
