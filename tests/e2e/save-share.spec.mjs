// Iteration 2 browser test: Save, unsaved guard, Share, limits, admin exemption, size limit
import { expect, test } from '@playwright/test'
import { BASE } from './base.mjs'
import { newContext, recordVideos } from './contexts.mjs'
import { freshServerPerFile } from './server.mjs'

freshServerPerFile()
recordVideos()

// Ek lamba flow (har qadam pichle par tika hai), is liye ek test; har check report me alag dikhta hai
test('Iteration 2: Save, unsaved changes, Share, limits, size limit, CSRF', async ({
  browser,
}, testInfo) => {
  const OUT = testInfo.outputDir
  const results = []
  const consoleErrors = []
  let n = 0

  // Har check report me dikhe (pass ya fail); fail par test aage chalta rahe (soft), aakhir me fail ho
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: Boolean(ok), detail })
    const line = `${name}${detail ? ` — ${detail}` : ''}`
    test.info().annotations.push({ type: ok ? 'pass' : 'FAIL', description: line })
    expect.soft(Boolean(ok), line).toBe(true)
  }

  async function newPage(opts = {}) {
    const ctx = await newContext(browser, { viewport: { width: 1280, height: 800 }, ...opts })
    const page = await ctx.newPage()
    // Payload csrf: test ki API calls bhi browser ki tarah Origin bhejen, warna login cookie nahi mana jata
    for (const m of ['get', 'post', 'patch', 'delete']) {
      const orig = page.request[m].bind(page.request)
      page.request[m] = (url, o = {}) =>
        orig(url, { ...o, headers: { Origin: BASE, ...o.headers } })
    }
    page.setDefaultTimeout(20000)
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(`${page.url()} :: ${m.text()}`)
    })
    page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: ${e}`))
    return page
  }

  async function shot(page, name) {
    n += 1
    await page.waitForTimeout(300)
    const path = `${OUT}/${String(n).padStart(2, '0')}-${name}.png`
    await page.screenshot({ path })
    await test.info().attach(name, { path, contentType: 'image/png' })
  }

  async function openDialog(page, testId) {
    for (let i = 0; i < 10; i++) {
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
    throw new Error(`dialog did not open via ${testId}`)
  }

  async function register(page, username, password = 'password123') {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await openDialog(page, 'intro-register')
    const form = page.getByTestId('register-form')
    await form.getByLabel('Username').fill(username)
    await form.getByLabel('Password', { exact: true }).fill(password)
    await form.getByLabel('Confirm password').fill(password)
    await form.getByRole('button', { name: 'Create account' }).click()
    await page.getByTestId('user-menu-trigger').waitFor()
  }

  async function signIn(page, username, password) {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await openDialog(page, 'header-signin')
    const form = page.getByTestId('signin-form')
    await form.getByLabel('Username').fill(username)
    await form.getByLabel('Password').fill(password)
    await form.getByRole('button', { name: 'Sign in' }).click()
    await page.getByTestId('user-menu-trigger').waitFor()
  }

  async function tryCreateBoard(page, title) {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'New board' }).first().click()
    const dlg = page.getByTestId('new-board-dialog')
    await dlg.getByLabel('Title').fill(title)
    await dlg.getByRole('button', { name: 'Create board' }).click()
    const outcome = await Promise.race([
      page.waitForURL(/\/b\//).then(() => 'created'),
      dlg
        .getByRole('alert')
        .waitFor()
        .then(() => 'error'),
    ])
    return { outcome, error: outcome === 'error' ? await dlg.getByRole('alert').innerText() : null }
  }

  // Popover kisi doosre page ke focus lene par band ho sakta hai — zaroorat ho to dobara kholo
  async function openShare(page) {
    for (let i = 0; i < 4; i++) {
      if (
        await page
          .getByTestId('share-popover')
          .isVisible()
          .catch(() => false)
      )
        return
      await page.getByTestId('share-button').click()
      await page.waitForTimeout(600)
    }
    await page.screenshot({ path: `${OUT}/debug-share-not-open.png` })
    throw new Error('share popover did not open')
  }

  const toastText = async (page) => {
    const toast = page.locator('[data-sonner-toast]').last()
    await toast.waitFor()
    return toast.innerText()
  }
  // Toasts ko DOM se khud na hatao (React crash) — unke khud band hone ka intezar
  const clearToasts = (page) =>
    page.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), null, {
      timeout: 15000,
    })

  const getBoard = async (page, slug) =>
    (
      await (
        await page.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
      ).json()
    ).docs?.[0]

  // ---------- Owner setup ----------
  const owner = await newPage({ permissions: ['clipboard-read', 'clipboard-write'] })
  await register(owner, 'teacher_1')
  const created = await tryCreateBoard(owner, 'Lecture one')
  check('Create board opens it', created.outcome === 'created', owner.url())
  const slug = new URL(owner.url()).pathname.split('/').pop()
  await owner.getByTestId('save-button').waitFor()

  check('Fresh board: Save disabled', await owner.getByTestId('save-button').isDisabled())
  check(
    'Fresh board: no unsaved indicator',
    (await owner.getByTestId('unsaved-indicator').count()) === 0,
  )
  await shot(owner, 'owner-board-clean')

  // ---------- Unsaved changes ----------
  const titleInput = owner.getByTestId('board-title-input')
  await titleInput.fill('Lecture one: Flexbox')
  check(
    'Edit title: unsaved indicator shows',
    await owner.getByTestId('unsaved-indicator').isVisible(),
  )
  check('Edit title: Save enabled', await owner.getByTestId('save-button').isEnabled())
  await shot(owner, 'owner-board-unsaved')

  let dialogs = []
  owner.on('dialog', async (d) => {
    dialogs.push(d.type())
    await d.dismiss()
  })
  await owner.getByRole('link', { name: 'Boards' }).click()
  await owner.waitForTimeout(500)
  check(
    'Unsaved: clicking logo asks to confirm (cancel stays)',
    dialogs.includes('confirm') && owner.url().includes(`/b/${slug}`),
    dialogs.join(','),
  )

  dialogs = []
  await owner.reload({ timeout: 3000 }).catch(() => {})
  await owner.waitForTimeout(500)
  check(
    'Unsaved: reload triggers beforeunload warning',
    dialogs.includes('beforeunload'),
    dialogs.join(','),
  )
  owner.removeAllListeners('dialog')
  check(
    'Unsaved: edits still there after cancelled reload',
    (await titleInput.inputValue()) === 'Lecture one: Flexbox',
  )

  await titleInput.fill('')
  check('Empty title: Save disabled', await owner.getByTestId('save-button').isDisabled())
  check(
    'Empty title: input marked invalid',
    (await titleInput.getAttribute('aria-invalid')) === 'true',
  )
  await titleInput.fill('Lecture one: Flexbox')

  // ---------- Save ----------
  await owner.getByTestId('save-button').click()
  const saveToast = await toastText(owner)
  check(
    'Save: success toast with saves left',
    /Saved/.test(saveToast) && /9 saves left/.test(saveToast),
    saveToast.replace(/\n/g, ' '),
  )
  await owner.getByTestId('unsaved-indicator').waitFor({ state: 'detached' })
  check(
    'Save: unsaved indicator gone',
    (await owner.getByTestId('unsaved-indicator').count()) === 0,
  )
  check('Save: Save disabled again', await owner.getByTestId('save-button').isDisabled())
  await shot(owner, 'owner-board-saved-toast')
  await clearToasts(owner)

  await owner.reload({ waitUntil: 'networkidle' })
  check(
    'Save: title persisted after reload',
    (await owner.getByTestId('board-title-input').inputValue()) === 'Lecture one: Flexbox',
  )
  check('Save: link (slug) unchanged after rename', owner.url().endsWith(`/b/${slug}`), owner.url())
  check('Save: browser tab title updated', (await owner.title()).startsWith('Lecture one: Flexbox'))

  await owner.getByTestId('board-title-input').fill('Lecture one: Flexbox basics')
  await owner.keyboard.press('Control+s')
  const ctrlToast = await toastText(owner)
  check(
    'Ctrl+S saves',
    /Saved/.test(ctrlToast) && /8 saves left/.test(ctrlToast),
    ctrlToast.replace(/\n/g, ' '),
  )
  await clearToasts(owner)

  // ---------- Save survives a failed request (no reload, changes kept) ----------
  let navigations = 0
  owner.on('framenavigated', (f) => {
    if (f === owner.mainFrame()) navigations += 1
  })
  await owner.route('**/api/boards/*/save', (route) => route.abort())
  await owner.getByTestId('board-title-input').fill('Offline edit')
  await owner.getByTestId('save-button').click()
  const offToast = await toastText(owner)
  check(
    'Failed save shows a message instead of reloading',
    /Could not reach the server/.test(offToast),
    offToast.replace(/\n/g, ' '),
  )
  check(
    'Failed save keeps the unsaved changes on the page',
    (await owner.getByTestId('board-title-input').inputValue()) === 'Offline edit' &&
      (await owner.getByTestId('unsaved-indicator').isVisible()),
  )
  check('Failed save does not reload the page', navigations === 0, `navigations=${navigations}`)
  await owner.unroute('**/api/boards/*/save')
  await clearToasts(owner)
  await owner.getByTestId('board-title-input').fill('Lecture one: Flexbox basics')
  check(
    'Back to the saved title: nothing unsaved',
    (await owner.getByTestId('unsaved-indicator').count()) === 0,
  )

  // ---------- Share ----------
  let board = await getBoard(owner, slug)
  const savesBeforeShare = board.saveCount
  await owner.getByTestId('share-button').click()
  await owner.getByTestId('share-popover').waitFor()
  check(
    'Share: off by default',
    (await owner.getByTestId('share-switch').getAttribute('aria-checked')) === 'false',
  )
  check('Share: Copy disabled while off', await owner.getByTestId('copy-link').isDisabled())
  check(
    'Share: link shows the board URL',
    (await owner.getByTestId('share-link').inputValue()) === `${BASE}/b/${slug}`,
  )
  await shot(owner, 'share-popover-off')

  const anon = await newPage()
  let res = await anon.goto(`${BASE}/b/${slug}`)
  check('Share off: anonymous gets 404', res.status() === 404, `status=${res.status()}`)

  await openShare(owner)
  await owner.getByTestId('share-switch').click()
  await owner.waitForFunction(
    () =>
      document.querySelector('[data-testid="share-switch"]')?.getAttribute('aria-checked') ===
      'true',
  )
  for (let i = 0; i < 20; i++) {
    board = await getBoard(owner, slug)
    if (board.isShared) break
    await owner.waitForTimeout(250)
  }
  check('Share on: saved on the server', board.isShared === true)
  check(
    'Share on: does not count as a save',
    board.saveCount === savesBeforeShare,
    `${savesBeforeShare} -> ${board.saveCount}`,
  )
  await openShare(owner)
  await owner.getByTestId('copy-link').click()
  const copyToast = await toastText(owner)
  const clip = await owner.evaluate(() => navigator.clipboard.readText())
  check(
    'Copy link: toast and clipboard',
    /Link copied/.test(copyToast) && clip === `${BASE}/b/${slug}`,
    clip,
  )
  await shot(owner, 'share-popover-on')
  await owner.keyboard.press('Escape')
  await clearToasts(owner)

  res = await anon.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  check('Share on: anonymous can open the link', res.status() === 200)
  check(
    'Anonymous: sees title as text and "View only"',
    (await anon.getByTestId('board-title').innerText()) === 'Lecture one: Flexbox basics' &&
      (await anon.getByTestId('view-only').isVisible()),
  )
  check(
    'Anonymous: no Save / Share / title input',
    (await anon.getByTestId('save-button').count()) === 0 &&
      (await anon.getByTestId('share-button').count()) === 0 &&
      (await anon.getByTestId('board-title-input').count()) === 0,
  )
  await shot(anon, 'shared-board-anonymous')

  const other = await newPage()
  await register(other, 'teacher_2')
  res = await other.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  check(
    'Other instructor: shared board is view only',
    res.status() === 200 &&
      (await other.getByTestId('view-only').isVisible()) &&
      (await other.getByTestId('save-button').count()) === 0,
  )
  const otherSave = await other.request.post(`${BASE}/api/boards/${board.id}/save`, {
    data: { title: 'pwned', data: null },
  })
  check(
    'Save endpoint: other instructor gets 403',
    otherSave.status() === 403,
    `status=${otherSave.status()}`,
  )
  const otherShare = await other.request.post(`${BASE}/api/boards/${board.id}/share`, {
    data: { isShared: false },
  })
  check(
    'Share endpoint: other instructor gets 403',
    otherShare.status() === 403,
    `status=${otherShare.status()}`,
  )
  const anonSave = await anon.request.post(`${BASE}/api/boards/${board.id}/save`, {
    data: { title: 'x', data: null },
  })
  check(
    'Save endpoint: signed out gets 401',
    anonSave.status() === 401,
    `status=${anonSave.status()}`,
  )

  await openShare(owner)
  await owner.getByTestId('share-switch').click()
  await owner.waitForFunction(
    () =>
      document.querySelector('[data-testid="share-switch"]')?.getAttribute('aria-checked') ===
      'false',
  )
  await owner.waitForTimeout(800)
  await owner.keyboard.press('Escape')
  res = await anon.goto(`${BASE}/b/${slug}`)
  check('Share off again: link stops working', res.status() === 404, `status=${res.status()}`)

  // ---------- Limits (admin lowers them) ----------
  const admin = await newPage()
  await signIn(admin, 'admin', 'admin')
  const setSettings = (data) => admin.request.post(`${BASE}/api/globals/settings`, { data })
  let st = await setSettings({ maxSavesPerBoardPerWindow: 3, maxBoardsPerWindow: 2 })
  check('Admin can change limits (settings Global)', st.ok(), `status=${st.status()}`)

  await owner.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  await owner.getByTestId('board-title-input').fill('Third save')
  await owner.getByTestId('save-button').click()
  let t = await toastText(owner)
  check('Save 3 of 3 allowed', /Saved/.test(t) && /0 saves left/.test(t), t.replace(/\n/g, ' '))
  await clearToasts(owner)
  await owner.getByTestId('board-title-input').fill('Fourth save')
  await owner.getByTestId('save-button').click()
  t = await toastText(owner)
  check(
    'Save 4 blocked with clear message',
    /can be saved 3 times every 24 hours/.test(t) && /Try again in/.test(t),
    t.replace(/\n/g, ' '),
  )
  check(
    'Blocked save keeps unsaved changes',
    await owner.getByTestId('unsaved-indicator').isVisible(),
  )
  await shot(owner, 'save-limit-reached')
  await clearToasts(owner)
  board = await getBoard(owner, slug)
  check('Blocked save did not write', board.title === 'Third save', board.title)

  let c = await tryCreateBoard(owner, 'Second board')
  check('Create 2 of 2 allowed', c.outcome === 'created')
  c = await tryCreateBoard(owner, 'Third board')
  check(
    'Create 3 blocked with clear message',
    c.outcome === 'error' && /up to 2 boards every 24 hours/.test(c.error ?? ''),
    c.error ?? '',
  )
  await shot(owner, 'create-limit-reached')
  await owner.keyboard.press('Escape')

  // Admin exempt
  for (const title of ['Admin one', 'Admin two', 'Admin three']) {
    const r = await tryCreateBoard(admin, title)
    if (r.outcome !== 'created') check(`Admin create "${title}"`, false, r.error ?? '')
  }
  const adminBoards = (
    await (await admin.request.get(`${BASE}/api/boards?where[title][like]=Admin&depth=0`)).json()
  ).totalDocs
  check('Admin: not limited when creating boards', adminBoards === 3, `count=${adminBoards}`)
  await admin.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  await admin.getByTestId('board-title-input').fill('Edited by admin')
  await admin.getByTestId('save-button').click()
  t = await toastText(admin)
  board = await getBoard(admin, slug)
  check(
    'Admin: can save an instructor board past the limit',
    /Saved/.test(t) && board.title === 'Edited by admin',
    t.replace(/\n/g, ' '),
  )
  check('Admin: counters untouched', board.saveCount === 3, `saveCount=${board.saveCount}`)

  // Size limit
  st = await setSettings({ maxContentBytes: 10000 })
  const big = {
    doc: {
      root: {
        type: 'root',
        version: 1,
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [{ type: 'text', version: 1, text: 'a'.repeat(15000), format: 0 }],
          },
        ],
      },
    },
  }
  await setSettings({ maxSavesPerBoardPerWindow: 10 })
  const patch = await other.request.patch(`${BASE}/api/boards/${board.id}`, { data: { data: big } })
  check('Non-owner cannot write board data (REST)', !patch.ok(), `status=${patch.status()}`)
  const ownBoard = await getBoard(owner, 'second-board')
  // UI wala raasta: Save endpoint
  const sizeRes = await owner.request.post(`${BASE}/api/boards/${ownBoard.id}/save`, {
    data: { title: 'Second board', data: big },
  })
  const sizeBody = await sizeRes.json()
  check(
    'Size limit: oversized board rejected with a clear message',
    sizeRes.status() === 400 && /too large/.test(sizeBody.error ?? ''),
    `status=${sizeRes.status()} ${sizeBody.error}`,
  )
  // csrf: kisi doosri site se (owner ki cookie ke saath bhi) save nahi hona chahiye
  const evil = await owner.request.post(`${BASE}/api/boards/${ownBoard.id}/save`, {
    data: { title: 'Hacked' },
    headers: { Origin: 'https://evil.example' },
  })
  check(
    'CSRF: save from another site is refused even with the owner cookie',
    evil.status() === 401 || evil.status() === 403,
    `status=${evil.status()}`,
  )
  st = await setSettings({
    maxSavesPerBoardPerWindow: 10,
    maxBoardsPerWindow: 10,
    maxContentBytes: 1800000,
  })
  check('Admin: limits reset to defaults', st.ok())

  // ---------- Mobile + dark ----------
  const m = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await signIn(m, 'teacher_1', 'password123')
  await m.goto(`${BASE}/b/second-board`, { waitUntil: 'networkidle' })
  await m.getByTestId('board-title-input').fill('Mobile edit')
  await shot(m, 'mobile-owner-unsaved')
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  check('Mobile: header fits (no horizontal overflow)', !overflow)
  m.on('dialog', (d) => d.accept())
  await m.getByTestId('theme-toggle').click()
  await m.getByTestId('share-button').click()
  await m.getByTestId('share-popover').waitFor()
  await shot(m, 'mobile-share-popover-dark')
  await m.keyboard.press('Escape')
  await m.getByTestId('theme-toggle').click()

  // 404 (private board), 429 (limit test) aur ERR_FAILED (jaan-boojh kar abort) expected hain
  const unexpected = consoleErrors.filter(
    (e) =>
      !e.includes('status of 404') &&
      !e.includes('status of 429') &&
      !e.includes('net::ERR_FAILED'),
  )
  check(
    'No unexpected browser console errors',
    unexpected.length === 0,
    `${unexpected.length} unexpected`,
  )
  for (const e of unexpected) console.log(`  ${e}`)
})
