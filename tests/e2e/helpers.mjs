// Naye specs ke liye mushtarka helpers: check (report me har check), pages, screenshots, account, board
import { expect, test } from '@playwright/test'
import { BASE } from './base.mjs'
import { newContext } from './contexts.mjs'

export function suite(browser, testInfo) {
  const consoleErrors = []
  let n = 0

  // Har check report me dikhe (pass ya fail); fail par test aage chalta rahe (soft), aakhir me fail ho
  const check = (name, ok, detail = '') => {
    const line = `${name}${detail ? ` — ${detail}` : ''}`
    test.info().annotations.push({ type: ok ? 'pass' : 'FAIL', description: line })
    expect.soft(Boolean(ok), line).toBe(true)
  }

  async function newPage(opts = {}) {
    const ctx = await newContext(browser, { viewport: { width: 1280, height: 800 }, ...opts })
    const page = await ctx.newPage()
    // Payload csrf: test ki API calls bhi browser ki tarah Origin bhejen
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
    const path = `${testInfo.outputDir}/${String(n).padStart(2, '0')}-${name}.png`
    await page.screenshot({ path })
    await testInfo.attach(name, { path, contentType: 'image/png' })
  }

  async function register(page, username) {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    // Hydration se pehle click kabhi kabhi khali jata hai: dialog khulne tak dobara
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('intro-register').click()
      if (
        await page
          .getByTestId('auth-dialog')
          .isVisible()
          .catch(() => false)
      )
        break
      await page.waitForTimeout(500)
    }
    const form = page.getByTestId('register-form')
    await form.getByLabel('Username').fill(username)
    await form.getByLabel('Password', { exact: true }).fill('password123')
    await form.getByLabel('Confirm password').fill('password123')
    await form.getByRole('button', { name: 'Create account' }).click()
    await page.getByTestId('user-menu-trigger').waitFor()
  }

  async function createBoard(page, title) {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'New board' }).first().click()
    const dlg = page.getByTestId('new-board-dialog')
    await dlg.getByLabel('Title').fill(title)
    await dlg.getByRole('button', { name: 'Create board' }).click()
    await page.waitForURL(/\/b\//)
    await page.getByTestId('board-editor').waitFor()
    return new URL(page.url()).pathname.split('/').pop()
  }

  async function share(page) {
    await page.getByTestId('share-button').click()
    await page.getByTestId('share-switch').click()
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="share-switch"]')?.getAttribute('aria-checked') ===
        'true',
    )
    await page.waitForTimeout(800)
    await page.keyboard.press('Escape')
  }

  async function save(page) {
    await page.getByTestId('save-button').click()
    await page.getByTestId('unsaved-indicator').waitFor({ state: 'detached' })
  }

  return { check, newPage, shot, register, createBoard, share, save, consoleErrors }
}
