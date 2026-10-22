// Iteration 1 browser test: auth modal, theme, boards, access control, admin
import { expect, test } from '@playwright/test'
import { BASE } from './base.mjs'
import { newContext, recordVideos } from './contexts.mjs'
import { freshServerPerFile } from './server.mjs'

freshServerPerFile()
recordVideos()

// Ek lamba flow (har qadam pichle par tika hai), is liye ek test; har check report me alag dikhta hai
test('Iteration 1: sign in / register, boards, permissions, admin', async ({
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
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(`${page.url()} :: ${m.text()}`)
    })
    page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: ${e}`))
    return page
  }

  async function shot(page, name) {
    n += 1
    const file = `${OUT}/${String(n).padStart(2, '0')}-${name}.png`
    await page.waitForTimeout(250)
    await page.screenshot({ path: file })
    await test.info().attach(name, { path: file, contentType: 'image/png' })
    return file
  }

  const isDark = (page) => page.evaluate(() => document.documentElement.classList.contains('dark'))
  const dialog = (page) => page.getByTestId('auth-dialog')

  // Hydration se pehle click zaya ho sakta hai — dialog nazar aane tak dobara click
  async function openDialog(page, testId) {
    for (let i = 0; i < 10; i++) {
      await page.getByTestId(testId).click()
      if (
        await dialog(page)
          .isVisible()
          .catch(() => false)
      )
        return
      await page.waitForTimeout(500)
    }
    throw new Error(`dialog did not open via ${testId}`)
  }

  async function register(page, username, password, confirm = password) {
    const form = page.getByTestId('register-form')
    await form.getByLabel('Username').fill(username)
    await form.getByLabel('Password', { exact: true }).fill(password)
    await form.getByLabel('Confirm password').fill(confirm)
    await form.getByRole('button', { name: 'Create account' }).click()
  }

  async function signIn(page, username, password) {
    await openDialog(page, 'header-signin')
    const form = page.getByTestId('signin-form')
    await form.getByLabel('Username').fill(username)
    await form.getByLabel('Password').fill(password)
    await form.getByRole('button', { name: 'Sign in' }).click()
  }

  async function signOut(page) {
    await page.getByTestId('user-menu-trigger').click()
    await page.getByTestId('logout').click()
    await page.getByTestId('header-signin').waitFor()
  }

  async function createBoard(page, title) {
    await page.getByRole('button', { name: 'New board' }).first().click()
    const dlg = page.getByTestId('new-board-dialog')
    await dlg.getByLabel('Title').fill(title)
    await dlg.getByRole('button', { name: 'Create board' }).click()
    await page.waitForURL(/\/b\//)
    return new URL(page.url()).pathname
  }

  // ---------- 1. Signed-out home + theme ----------
  const a = await newPage()
  await a.goto(BASE, { waitUntil: 'networkidle' })
  check(
    'Home loads signed out with intro',
    await a.getByRole('heading', { name: 'Lecture boards for instructors' }).isVisible(),
  )
  check('Light theme is the default', !(await isDark(a)))
  await shot(a, 'home-signed-out-light')

  await a.getByTestId('theme-toggle').click()
  check('Theme toggle switches to dark', await isDark(a))
  await shot(a, 'home-signed-out-dark')
  await a.reload({ waitUntil: 'domcontentloaded' })
  check('Dark theme survives reload (applied before paint)', await isDark(a))
  await a.waitForLoadState('networkidle')
  await a.getByTestId('theme-toggle').click()
  check('Theme toggle switches back to light', !(await isDark(a)))

  // ---------- 2. Register validation ----------
  await openDialog(a, 'intro-register')
  await a.getByTestId('register-form').getByRole('button', { name: 'Create account' }).click()
  check('Register: empty form shows errors', await a.getByText('Username is required').isVisible())
  await shot(a, 'register-empty-errors')

  await register(a, 'ab', 'short')
  check(
    'Register: username too short rejected on client',
    await a.getByText('Username must be 3-20 characters').isVisible(),
  )
  check(
    'Register: password too short rejected on client',
    await a.getByText('Password must be at least 8 characters').isVisible(),
  )
  await register(a, 'bad name!', 'password123')
  check(
    'Register: invalid characters rejected',
    await a.getByText('Username can only contain letters a-z').isVisible(),
  )
  await register(a, 'teacher_1', 'password123', 'password124')
  check(
    'Register: password mismatch rejected',
    await a.getByText('Passwords do not match').isVisible(),
  )
  await shot(a, 'register-validation-errors')

  await register(a, 'admin', 'password123')
  await a
    .getByText('This username is reserved')
    .waitFor({ timeout: 10000 })
    .catch(() => {})
  check(
    'Register: reserved username "admin" rejected by server',
    await a.getByText('This username is reserved').isVisible(),
  )

  // ---------- 3. Successful register (uppercase input becomes lowercase) ----------
  await register(a, 'Teacher_1', 'password123')
  await a.getByTestId('user-menu-trigger').waitFor({ timeout: 15000 })
  check('Register: success signs the user in', await a.getByTestId('user-menu-trigger').isVisible())
  check(
    'Register: username saved in lowercase',
    (await a.getByTestId('user-menu-trigger').innerText()).includes('teacher_1'),
  )
  check('My boards empty state shown', await a.getByText('No boards yet').isVisible())
  await shot(a, 'home-signed-in-empty')

  const me = await (await a.request.get(`${BASE}/api/users/me`)).json()
  check(
    'New account has role "instructor"',
    me?.user?.role === 'instructor',
    `role=${me?.user?.role}`,
  )

  await a.getByTestId('user-menu-trigger').click()
  await a.waitForTimeout(300)
  await shot(a, 'user-menu-open')
  await a.keyboard.press('Escape')

  // ---------- 4. Duplicate username (case-insensitive) ----------
  const b = await newPage()
  await b.goto(BASE, { waitUntil: 'networkidle' })
  await openDialog(b, 'intro-register')
  await register(b, 'TEACHER_1', 'password123')
  await b
    .getByText('This username is already taken')
    .waitFor({ timeout: 10000 })
    .catch(() => {})
  check(
    'Register: duplicate username (other case) rejected',
    await b.getByText('This username is already taken').isVisible(),
  )
  await shot(b, 'register-duplicate-username')
  await b.keyboard.press('Escape')

  // ---------- 5. Create boards ----------
  await a.getByRole('button', { name: 'New board' }).first().click()
  await a.getByTestId('new-board-dialog').getByRole('button', { name: 'Create board' }).click()
  check('New board: empty title rejected', await a.getByText('Title is required').isVisible())
  await shot(a, 'new-board-empty-title')
  await a.getByTestId('new-board-dialog').getByRole('button', { name: 'Cancel' }).click()

  const path1 = await createBoard(a, 'CSS Flexbox basics')
  check('New board: opens /b/<slug>', path1 === '/b/css-flexbox-basics', path1)
  check('Owner sees no "View only" badge', (await a.getByTestId('view-only').count()) === 0)
  check(
    'Board title shown in header',
    (await a.getByTestId('board-title-input').inputValue()) === 'CSS Flexbox basics',
  )
  await shot(a, 'board-owner-view')

  await a.goto(BASE, { waitUntil: 'networkidle' })
  const path2 = await createBoard(a, 'CSS Flexbox basics')
  check('Same title gets a unique slug', /^\/b\/css-flexbox-basics-[a-z0-9]{4}$/.test(path2), path2)
  await a.goto(BASE, { waitUntil: 'networkidle' })
  check(
    'My boards lists both boards',
    (await a.getByTestId('board-list').locator('li').count()) === 2,
  )
  await shot(a, 'home-my-boards')

  // ---------- 6. Access control ----------
  const boardRes = await (
    await a.request.get(`${BASE}/api/boards?where[slug][equals]=css-flexbox-basics`)
  ).json()
  const board = boardRes.docs?.[0]
  const anon = await newPage()
  let res = await anon.goto(`${BASE}${path1}`)
  check('Anonymous: private board returns 404', res.status() === 404, `status=${res.status()}`)
  await shot(anon, 'board-private-anonymous-404')
  const anonList = await (await anon.request.get(`${BASE}/api/boards`)).json()
  check(
    'Anonymous: REST list returns no private boards',
    anonList.totalDocs === 0,
    `totalDocs=${anonList.totalDocs}`,
  )

  // Owner field/counter tampering is ignored, share via REST (Share UI comes in Iteration 2)
  let patch = await a.request.patch(`${BASE}/api/boards/${board.id}`, {
    data: { isShared: true, saveCount: 99, slug: 'hacked', owner: 9999 },
  })
  const patched = (await patch.json()).doc
  check(
    'Owner can share own board (REST)',
    patch.ok() && patched?.isShared === true,
    `status=${patch.status()}`,
  )
  check(
    'Owner cannot change slug/counters/owner',
    patched?.slug === 'css-flexbox-basics' &&
      patched?.saveCount === 0 &&
      (patched?.owner?.id ?? patched?.owner) === (board.owner?.id ?? board.owner),
    JSON.stringify({
      slug: patched?.slug,
      saveCount: patched?.saveCount,
      owner: patched?.owner?.id ?? patched?.owner,
    }),
  )

  res = await anon.goto(`${BASE}${path1}`, { waitUntil: 'networkidle' })
  check('Anonymous: shared board opens', res.status() === 200)
  check('Anonymous: sees "View only" badge', await anon.getByTestId('view-only').isVisible())
  await shot(anon, 'board-shared-anonymous-view-only')
  patch = await anon.request.patch(`${BASE}/api/boards/${board.id}`, { data: { title: 'pwned' } })
  check('Anonymous: cannot update a shared board', !patch.ok(), `status=${patch.status()}`)

  // Second instructor
  const c = await newPage()
  await c.goto(BASE, { waitUntil: 'networkidle' })
  await openDialog(c, 'intro-register')
  await register(c, 'teacher_2', 'password123')
  await c.getByTestId('user-menu-trigger').waitFor({ timeout: 15000 })
  res = await c.goto(`${BASE}${path2}`)
  check(
    'Other instructor: private board returns 404',
    res.status() === 404,
    `status=${res.status()}`,
  )
  res = await c.goto(`${BASE}${path1}`, { waitUntil: 'networkidle' })
  check(
    'Other instructor: shared board is view only',
    res.status() === 200 && (await c.getByTestId('view-only').isVisible()),
  )
  patch = await c.request.patch(`${BASE}/api/boards/${board.id}`, { data: { title: 'pwned' } })
  check('Other instructor: cannot update the board', !patch.ok(), `status=${patch.status()}`)
  await c.getByTestId('theme-toggle').click()
  await c.reload({ waitUntil: 'networkidle' })
  check('Dark theme persists on the board page', await isDark(c))
  await shot(c, 'board-view-only-dark')
  res = await c.goto(`${BASE}${path2}`, { waitUntil: 'networkidle' })
  check('Dark theme also on the 404 page', await isDark(c))
  await shot(c, 'board-404-dark')
  await c.getByTestId('theme-toggle').click()
  const del = await c.request.delete(`${BASE}/api/boards/${board.id}`)
  check('Other instructor: cannot delete the board', !del.ok(), `status=${del.status()}`)
  const cMe = await (await c.request.get(`${BASE}/api/users`)).json()
  check(
    'Instructor: user list shows only themselves',
    cMe.totalDocs === 1,
    `totalDocs=${cMe.totalDocs}`,
  )
  const roleHack = await c.request.patch(`${BASE}/api/users/${cMe.docs[0].id}`, {
    data: { role: 'admin' },
  })
  const afterHack = await (await c.request.get(`${BASE}/api/users/me`)).json()
  check(
    'Instructor: cannot make themselves admin',
    afterHack.user.role === 'instructor',
    `status=${roleHack.status()}`,
  )
  const createUser = await anon.request.post(`${BASE}/api/users`, {
    data: { username: 'sneaky', password: 'password123', role: 'admin' },
  })
  check('Anonymous: REST user create blocked', !createUser.ok(), `status=${createUser.status()}`)
  const settingsRes = await anon.request.get(`${BASE}/api/globals/settings`)
  check(
    'Anonymous: settings Global not readable',
    !settingsRes.ok(),
    `status=${settingsRes.status()}`,
  )
  res = await c.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  await c.waitForTimeout(2000)
  check(
    'Instructor: cannot use /admin',
    !(await c
      .getByText('Collections')
      .isVisible()
      .catch(() => false)),
    c.url(),
  )
  await shot(c, 'admin-instructor-denied')

  // ---------- 7. Sign out / sign in ----------
  await signOut(a)
  check(
    'Sign out returns to intro',
    await a.getByRole('heading', { name: 'Lecture boards for instructors' }).isVisible(),
  )
  await signIn(a, 'teacher_1', 'wrongpass1')
  await a
    .getByText('Invalid username or password')
    .waitFor({ timeout: 10000 })
    .catch(() => {})
  check(
    'Sign in: wrong password shows error',
    await a.getByText('Invalid username or password').isVisible(),
  )
  await shot(a, 'signin-wrong-password')
  const form = a.getByTestId('signin-form')
  await form.getByLabel('Username').fill('TEACHER_1')
  await form.getByLabel('Password').fill('password123')
  await form.getByRole('button', { name: 'Sign in' }).click()
  await a
    .getByTestId('user-menu-trigger')
    .waitFor({ timeout: 15000 })
    .catch(() => {})
  check(
    'Sign in works (username case-insensitive)',
    await a.getByTestId('user-menu-trigger').isVisible(),
  )

  // ---------- 8. Admin ----------
  const adm = await newPage()
  await adm.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' })
  await adm.getByLabel('Username').fill('admin')
  await adm.getByLabel('Password').fill('admin')
  await adm.getByRole('button', { name: 'Login' }).click()
  await adm.waitForURL(/\/admin$/, { timeout: 20000 }).catch(() => {})
  await adm.waitForTimeout(1500)
  check('Admin: can sign in to /admin', /\/admin$/.test(adm.url()), adm.url())
  await shot(adm, 'admin-dashboard')
  await adm.goto(`${BASE}/admin/collections/users`, { waitUntil: 'networkidle' })
  await adm.waitForTimeout(1500)
  check(
    'Admin: users list shows instructor role',
    await adm
      .getByText('instructor')
      .first()
      .isVisible()
      .catch(() => false),
  )
  await shot(adm, 'admin-users')
  await adm.goto(`${BASE}/admin/globals/settings`, { waitUntil: 'networkidle' })
  await adm.waitForTimeout(1500)
  await shot(adm, 'admin-settings-global')
  const admBoards = await (await adm.request.get(`${BASE}/api/boards`)).json()
  check('Admin: sees all boards', admBoards.totalDocs === 2, `totalDocs=${admBoards.totalDocs}`)

  // ---------- 8b. Account lock after repeated wrong passwords ----------
  const lk = await newPage()
  await lk.goto(BASE, { waitUntil: 'networkidle' })
  await openDialog(lk, 'header-signin')
  const lkForm = lk.getByTestId('signin-form')
  for (let i = 0; i < 6; i++) {
    await lkForm.getByLabel('Username').fill('teacher_2')
    await lkForm.getByLabel('Password').fill(`wrong-pass-${i}`)
    await lkForm.getByRole('button', { name: 'Sign in' }).click()
    await lk.waitForTimeout(1200)
  }
  check(
    'Sign in: account locked after repeated wrong passwords',
    await lk.getByText('Too many failed attempts').isVisible(),
  )
  await shot(lk, 'signin-account-locked')

  // ---------- 9. Mobile ----------
  const m = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await m.goto(BASE, { waitUntil: 'networkidle' })
  await shot(m, 'mobile-home-signed-out')
  await openDialog(m, 'header-signin')
  await shot(m, 'mobile-signin-dialog')
  await m.keyboard.press('Escape')
  await m.goto(`${BASE}${path1}`, { waitUntil: 'networkidle' })
  await shot(m, 'mobile-board-view-only')
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  check('Mobile: no horizontal overflow', !overflow)

  // Private board ka 404 status browser "Failed to load resource" ke taur par log karta hai — yeh expected hai
  const unexpected = consoleErrors.filter((e) => !e.includes('status of 404'))
  check(
    'No unexpected browser console errors',
    unexpected.length === 0,
    `${unexpected.length} unexpected`,
  )
  console.log(`Console errors: ${consoleErrors.length} (unexpected: ${unexpected.length})`)
  for (const e of consoleErrors) console.log(`  ${e}`)
})
