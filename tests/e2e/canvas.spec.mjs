// Iteration 3 browser test: infinite canvas, live markdown, move/resize/delete, undo/redo, zoom, culling
import { expect, test } from '@playwright/test'
import { BASE } from './base.mjs'
import { newContext, recordVideos } from './contexts.mjs'
import { freshServerPerFile } from './server.mjs'

freshServerPerFile()
recordVideos()

// Ek lamba flow (har qadam pichle par tika hai), is liye ek test; har check report me alag dikhta hai
test('Iteration 3: canvas, live markdown, move/resize/text scale, undo/redo, zoom, culling', async ({
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

  async function register(page, username) {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await openDialog(page, 'intro-register')
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
    await page.getByTestId('canvas-surface').waitFor()
    return new URL(page.url()).pathname.split('/').pop()
  }

  const surface = (page) => page.getByTestId('canvas-surface')
  const editor = (page) => page.getByTestId('text-editor')
  const lineTypes = (loc) =>
    loc.evaluate((el) => {
      const lines = el.querySelector('.md-lines') ?? el
      return Array.from(lines.children).map((c) => c.getAttribute('data-type'))
    })
  const blockCount = (page) => page.getByTestId('text-block').count()
  const box = async (loc) => {
    const b = await loc.boundingBox()
    return {
      x: Math.round(b.x),
      y: Math.round(b.y),
      w: Math.round(b.width),
      h: Math.round(b.height),
    }
  }
  // GC ke baad JS heap (MB) — CDP se, taake shor kam ho
  async function heapMb(page) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('HeapProfiler.collectGarbage')
    const { usedSize } = await cdp.send('Runtime.getHeapUsage')
    return Math.round((usedSize / 1024 / 1024) * 10) / 10
  }
  const zoomText = (page) => page.getByTestId('zoom-level').innerText()

  // ---------- Owner ----------
  const owner = await newPage({ permissions: ['clipboard-read', 'clipboard-write'] })
  await register(owner, 'teacher_1')
  const slug = await createBoard(owner, 'Canvas lecture')
  check(
    'Board page shows the canvas and toolbar',
    await owner.getByTestId('canvas-toolbar').isVisible(),
  )
  check('Empty board shows a hint', await owner.getByText('Double-click anywhere').isVisible())
  check(
    'Owner has Select / Hand / Text tools',
    (await owner.getByTestId('tool-text').count()) === 1,
  )
  await shot(owner, 'empty-board')

  // Live markdown
  await surface(owner).dblclick({ position: { x: 400, y: 200 } })
  await editor(owner).waitFor()
  check('Double-click creates a block in edit mode', (await blockCount(owner)) === 1)
  await owner.keyboard.type('# ')
  check('"# " turns the line into a heading', (await lineTypes(editor(owner)))[0] === 'h1')
  await owner.keyboard.type('Flexbox basics')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('A short intro paragraph.')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- ')
  await owner.keyboard.type('first point')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('second point')
  check(
    'Enter continues a bullet list',
    JSON.stringify((await lineTypes(editor(owner))).slice(0, 4)) === '["h1","p","ul","ul"]',
    JSON.stringify(await lineTypes(editor(owner))),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  check(
    'Enter on an empty list item ends the list',
    (await lineTypes(editor(owner)))[4] === 'p',
    JSON.stringify(await lineTypes(editor(owner))),
  )
  await owner.keyboard.type('1. ')
  await owner.keyboard.type('step one')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('step two')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('## ')
  await owner.keyboard.type('Sub heading')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('### ')
  await owner.keyboard.type('Small heading')
  const typesNow = await lineTypes(editor(owner))
  check(
    '"1. " numbered list, "## " and "### " headings',
    JSON.stringify(typesNow) === '["h1","p","ul","ul","ol","ol","h2","h3"]',
    JSON.stringify(typesNow),
  )
  await owner.keyboard.press('Home')
  await owner.keyboard.press('Backspace')
  check(
    'Backspace at the start of a heading turns it back to text',
    (await lineTypes(editor(owner)))[7] === 'p',
  )
  await owner.keyboard.type('### ')
  await shot(owner, 'editing-live-markdown')
  await owner.keyboard.press('Escape')
  await editor(owner).waitFor({ state: 'detached' })
  const block = owner.getByTestId('text-block').first()
  const viewTypes = await lineTypes(block)
  check(
    'Read view keeps the formatting after leaving edit mode',
    JSON.stringify(viewTypes) === '["h1","p","ul","ul","ol","ol","h2","h3"]',
    JSON.stringify(viewTypes),
  )
  check(
    'Numbered list shows 1. and 2.',
    await block.evaluate((el) => {
      const ol = el.querySelectorAll('[data-type="ol"]')
      return getComputedStyle(ol[0], '::before').content === 'counter(md-ol) "."' && ol.length === 2
    }),
  )
  check('Editing marks the board unsaved', await owner.getByTestId('unsaved-indicator').isVisible())
  await shot(owner, 'block-read-view')

  // Save + reload
  await owner.getByTestId('save-button').click()
  await owner.locator('[data-sonner-toast]', { hasText: 'Saved' }).waitFor()
  await owner.reload({ waitUntil: 'networkidle' })
  await owner.getByTestId('text-block').first().waitFor()
  check(
    'Block and formatting survive Save + reload',
    JSON.stringify(await lineTypes(owner.getByTestId('text-block').first())) ===
      JSON.stringify(viewTypes),
  )
  check(
    'Text survives Save + reload',
    (await owner.getByTestId('text-block').first().innerText()).includes('Flexbox basics'),
  )

  // Pan does not mark unsaved
  const before = await box(owner.getByTestId('text-block').first())
  await owner.mouse.move(900, 600)
  await owner.mouse.down()
  await owner.mouse.move(800, 500, { steps: 5 })
  await owner.mouse.up()
  const afterPan = await box(owner.getByTestId('text-block').first())
  check(
    'Dragging empty space pans the canvas',
    afterPan.x === before.x - 100 && afterPan.y === before.y - 100,
    `${JSON.stringify(before)} -> ${JSON.stringify(afterPan)}`,
  )
  check(
    'Panning does not mark the board unsaved',
    (await owner.getByTestId('unsaved-indicator').count()) === 0,
  )

  // Move, undo, redo
  const b1 = owner.getByTestId('text-block').first()
  const s1 = await box(b1)
  await owner.mouse.move(s1.x + 40, s1.y + 15)
  await owner.mouse.down()
  await owner.mouse.move(s1.x + 190, s1.y + 95, { steps: 8 })
  await owner.mouse.up()
  const s2 = await box(b1)
  check(
    'Dragging a block moves it',
    s2.x === s1.x + 150 && s2.y === s1.y + 80,
    `${JSON.stringify(s1)} -> ${JSON.stringify(s2)}`,
  )
  check('Moving marks the board unsaved', await owner.getByTestId('unsaved-indicator').isVisible())
  await owner.getByTestId('undo').click()
  const s3 = await box(b1)
  check('Undo puts the block back', s3.x === s1.x && s3.y === s1.y, JSON.stringify(s3))
  await owner.keyboard.press('Control+Shift+z')
  const s4 = await box(b1)
  check('Redo (Ctrl+Shift+Z) moves it again', s4.x === s2.x && s4.y === s2.y, JSON.stringify(s4))

  // Resize: koi handle nahi, block ki border lines aur kone kheencho (width + height)
  async function dragHandle(page, edge, dx, dy, block = page.getByTestId('text-block').first()) {
    const r = await box(block)
    const x = edge.includes('e') ? r.x + r.w : edge.includes('w') ? r.x : r.x + r.w / 2
    const y = edge.startsWith('s') ? r.y + r.h : edge.startsWith('n') ? r.y : r.y + r.h / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(100)
  }
  const cursorAt = (page, x, y) =>
    page.evaluate(([px, py]) => getComputedStyle(document.elementFromPoint(px, py)).cursor, [x, y])
  await surface(owner).click({ position: { x: 1200, y: 400 } })
  await owner.mouse.move(5, 400)
  const shadowOf = (loc) => loc.evaluate((el) => getComputedStyle(el).boxShadow)
  const noRing = await shadowOf(b1)
  const hb = await box(b1)
  await owner.mouse.move(hb.x + 30, hb.y + 10)
  const hoverRing = await shadowOf(b1)
  await owner.mouse.move(5, 400)
  await b1.click()
  await owner.mouse.move(5, 400)
  const selectedRing = await shadowOf(b1)
  check(
    'Selected block uses the same thin border as hover',
    hoverRing !== noRing && selectedRing === hoverRing,
    `hover=${hoverRing} | selected=${selectedRing}`,
  )
  const handleLook = await owner.locator('[data-testid^="resize-"]').evaluateAll((els) =>
    els.map((e) => {
      const c = getComputedStyle(e)
      return [c.backgroundColor, c.borderTopWidth, c.boxShadow]
    }),
  )
  check(
    'No visible resize handles (border lines are the grab area)',
    handleLook.length === 8 &&
      handleLook.every(
        ([bg, bw, sh]) => bg === 'rgba(0, 0, 0, 0)' && bw === '0px' && sh === 'none',
      ),
    JSON.stringify(handleLook[0]),
  )
  const cb = await box(b1)
  const cursors = {
    top: await cursorAt(owner, cb.x + cb.w / 2, cb.y),
    bottom: await cursorAt(owner, cb.x + cb.w / 2, cb.y + cb.h + 2),
    left: await cursorAt(owner, cb.x - 2, cb.y + cb.h / 2),
    right: await cursorAt(owner, cb.x + cb.w, cb.y + cb.h / 2),
    corner: await cursorAt(owner, cb.x + cb.w + 1, cb.y + cb.h + 1),
    inside: await cursorAt(owner, cb.x + 30, cb.y + cb.h / 2),
  }
  check(
    'Resize cursor on the border lines and corners, move cursor inside',
    cursors.top === 'ns-resize' &&
      cursors.bottom === 'ns-resize' &&
      cursors.left === 'ew-resize' &&
      cursors.right === 'ew-resize' &&
      cursors.corner === 'nwse-resize' &&
      cursors.inside === 'move',
    JSON.stringify(cursors),
  )
  const fontPx = (loc) =>
    loc.evaluate((el) =>
      Number.parseFloat(
        getComputedStyle(
          el.querySelector('.md-lines > [data-type="h1"]') ?? el.querySelector('.md-lines'),
        ).fontSize,
      ),
    )
  const r0 = await box(b1)
  const f0 = await fontPx(b1)
  await dragHandle(owner, 'se', 120, 80)
  const r1 = await box(b1)
  const f1 = await fontPx(b1)
  const k1 = r1.w / r0.w
  check(
    'Corner (bottom-right) scales the block in proportion',
    k1 > 1.2 && Math.abs(r1.h / r0.h - k1) < 0.03 && r1.x === r0.x && r1.y === r0.y,
    `${JSON.stringify(r0)} -> ${JSON.stringify(r1)}`,
  )
  check(
    'Corner resize scales the text with the block',
    Math.abs(f1 / f0 - k1) < 0.03,
    `font ${f0}px -> ${f1}px, block x${k1.toFixed(3)}`,
  )
  const fE0 = await fontPx(b1)
  const rE0 = await box(b1)
  await dragHandle(owner, 'e', 80, 0)
  const rE1 = await box(b1)
  check(
    'Edge resize changes only the box, text keeps its size',
    Math.abs(rE1.w - (rE0.w + 80)) <= 2 && (await fontPx(b1)) === fE0,
    `w ${rE0.w} -> ${rE1.w}, font ${fE0} -> ${await fontPx(b1)}`,
  )
  await owner.keyboard.press('Control+z')
  await dragHandle(owner, 's', 0, 60)
  const r2 = await box(b1)
  check(
    'Bottom edge makes the block taller',
    Math.abs(r2.h - (r1.h + 60)) <= 2 && r2.w === r1.w,
    `${r1.h} -> ${r2.h}`,
  )
  await dragHandle(owner, 'n', 0, -40)
  const r3 = await box(b1)
  check(
    'Top edge grows upward (top moves, bottom stays)',
    Math.abs(r3.y - (r2.y - 40)) <= 2 && Math.abs(r3.y + r3.h - (r2.y + r2.h)) <= 2,
    `${JSON.stringify(r2)} -> ${JSON.stringify(r3)}`,
  )
  await dragHandle(owner, 'w', -50, 0)
  const r4 = await box(b1)
  check(
    'Left edge grows to the left (right side stays)',
    Math.abs(r4.x - (r3.x - 50)) <= 2 && Math.abs(r4.x + r4.w - (r3.x + r3.w)) <= 2,
    `${JSON.stringify(r3)} -> ${JSON.stringify(r4)}`,
  )
  const f4 = await fontPx(b1)
  await dragHandle(owner, 'nw', 60, 60)
  const r5 = await box(b1)
  const k5 = r5.w / r4.w
  check(
    'Top-left corner shrinks everything toward the bottom-right corner',
    k5 < 0.95 &&
      Math.abs(r5.x + r5.w - (r4.x + r4.w)) <= 2 &&
      Math.abs(r5.y + r5.h - (r4.y + r4.h)) <= 3 &&
      Math.abs((await fontPx(b1)) / f4 - k5) < 0.03,
    `${JSON.stringify(r4)} -> ${JSON.stringify(r5)}`,
  )
  const contentH = await b1.evaluate((el) => el.firstElementChild.offsetHeight + 16)
  await dragHandle(owner, 's', 0, -2000)
  const r6 = await box(b1)
  check(
    'Height never goes below the text (no text cut off)',
    Math.abs(r6.h - contentH) <= 2,
    `content ${contentH}, block ${r6.h}`,
  )
  const textFits = await b1.evaluate((el) => {
    const content = el.firstElementChild.getBoundingClientRect()
    return content.bottom <= el.getBoundingClientRect().bottom + 0.5
  })
  check('All text still visible after shrinking', textFits)
  await dragHandle(owner, 'se', 60, 100)
  const r7 = await box(b1)
  await shot(owner, 'block-resized-both-ways')
  await owner.keyboard.press('Control+z')
  const r8 = await box(b1)
  check(
    'Undo reverts a resize',
    Math.abs(r8.h - r6.h) <= 2 && Math.abs(r8.w - r6.w) <= 2,
    `${JSON.stringify(r7)} -> ${JSON.stringify(r8)}`,
  )
  await owner.keyboard.press('Control+Shift+z')
  const scaleBefore = await b1.evaluate((el) => el.style.getPropertyValue('--text-scale'))
  const fontBefore = await fontPx(b1)
  await owner.getByTestId('save-button').click()
  await owner.locator('[data-sonner-toast]', { hasText: 'Saved' }).last().waitFor()
  await owner.reload({ waitUntil: 'networkidle' })
  const r9 = await box(owner.getByTestId('text-block').first())
  check(
    'Resized size survives Save + reload',
    Math.abs(r9.w - r7.w) <= 2 && Math.abs(r9.h - r7.h) <= 2,
    `${JSON.stringify(r7)} -> ${JSON.stringify(r9)}`,
  )
  const scaleAfter = await owner
    .getByTestId('text-block')
    .first()
    .evaluate((el) => el.style.getPropertyValue('--text-scale'))
  check(
    'Text size survives Save + reload',
    scaleAfter === scaleBefore &&
      scaleAfter !== '1' &&
      (await fontPx(owner.getByTestId('text-block').first())) === fontBefore,
    `scale ${scaleBefore} -> ${scaleAfter}`,
  )
  const s5 = r9
  const b1r = owner.getByTestId('text-block').first()
  await b1r.dblclick()
  await editor(owner).waitFor()
  await owner.keyboard.press('Control+End')
  for (let i = 0; i < 12; i++) {
    await owner.keyboard.press('Enter')
    await owner.keyboard.type(`extra line ${i}`)
  }
  const grown = await box(b1r)
  check('Typing more text than fits grows the block', grown.h > s5.h, `${s5.h} -> ${grown.h}`)
  await owner.keyboard.press('Escape')
  await owner.keyboard.press('Control+z')
  await editor(owner).waitFor({ state: 'detached' })
  // Delete + undo
  await b1.click()
  await owner.keyboard.press('Delete')
  check('Delete key removes the selected block', (await blockCount(owner)) === 0)
  await owner.keyboard.press('Control+z')
  check('Undo brings the block back', (await blockCount(owner)) === 1)

  // Shortcuts do not fire while typing in the title
  await b1.click()
  await owner.getByTestId('board-title-input').click()
  await owner.keyboard.press('Delete')
  check('Delete in the title input does not delete the block', (await blockCount(owner)) === 1)

  // Text tool + empty block is removed
  await owner.getByTestId('tool-text').click()
  await surface(owner).click({ position: { x: 300, y: 600 } })
  await editor(owner).waitFor()
  check('Text tool click creates a block', (await blockCount(owner)) === 2)
  await owner.keyboard.type('typed right away')
  check(
    'Text tool block takes typing immediately (has focus)',
    (await editor(owner).innerText()).includes('typed right away'),
  )
  await owner.keyboard.press('Control+a')
  await owner.keyboard.press('Backspace')
  await owner.keyboard.press('Escape')
  await owner.waitForTimeout(200)
  check('Leaving an empty block removes it', (await blockCount(owner)) === 1)
  check(
    'Tool goes back to Select after creating',
    (await owner.getByTestId('tool-select').getAttribute('aria-pressed')) === 'true',
  )

  // Paste markdown
  await surface(owner).dblclick({ position: { x: 300, y: 650 } })
  await editor(owner).waitFor()
  await owner.evaluate(() => navigator.clipboard.writeText('## Pasted heading\n- alpha\n- beta'))
  await owner.keyboard.press('Control+v')
  check(
    'Pasted markdown is formatted',
    JSON.stringify(await lineTypes(editor(owner))) === '["h2","ul","ul"]',
    JSON.stringify(await lineTypes(editor(owner))),
  )
  await surface(owner).click({ position: { x: 1100, y: 150 } })
  await owner.waitForTimeout(200)
  check('Clicking empty space leaves edit mode', (await editor(owner).count()) === 0)
  // Bina select kiye seedha border kheencho
  const pasted = owner.getByTestId('text-block').nth(1)
  const p0 = await box(pasted)
  await dragHandle(owner, 'e', 70, 0, pasted)
  const p1 = await box(pasted)
  check(
    'Unselected block resizes straight from its right border line',
    Math.abs(p1.w - (p0.w + 70)) <= 2 && p1.x === p0.x,
    `${JSON.stringify(p0)} -> ${JSON.stringify(p1)}`,
  )

  // Zoom
  await owner.getByTestId('zoom-in').click()
  check('Zoom in button: 120%', (await zoomText(owner)) === '120%', await zoomText(owner))
  await owner.getByTestId('zoom-level').click()
  check('Click on % resets to 100%', (await zoomText(owner)) === '100%')
  await owner.mouse.move(640, 400)
  await owner.keyboard.down('Control')
  await owner.mouse.wheel(0, -200)
  await owner.keyboard.up('Control')
  await owner.waitForTimeout(100)
  const wheelZoom = Number.parseInt(await zoomText(owner), 10)
  check('Ctrl + wheel zooms in at the cursor', wheelZoom > 100, `${wheelZoom}%`)
  await owner.getByTestId('zoom-fit').click()
  await owner.waitForTimeout(200)
  const fitBoxes = await owner
    .getByTestId('text-block')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
  check(
    'Fit to content shows every block on screen',
    fitBoxes.every((r) => r.left >= 0 && r.right <= 1280 && r.top >= 48 && r.bottom <= 800),
    JSON.stringify(fitBoxes.map((r) => [Math.round(r.left), Math.round(r.top)])),
  )
  await shot(owner, 'zoomed-to-fit')

  await owner.getByTestId('save-button').click()
  await owner.locator('[data-sonner-toast]', { hasText: 'Saved' }).waitFor()

  // ---------- Share and visitor ----------
  await owner.getByTestId('share-button').click()
  await owner.getByTestId('share-switch').click()
  await owner.waitForFunction(
    () =>
      document.querySelector('[data-testid="share-switch"]')?.getAttribute('aria-checked') ===
      'true',
  )
  await owner.waitForTimeout(800)
  await owner.keyboard.press('Escape')

  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  await visitor.getByTestId('text-block').first().waitFor()
  check('Visitor sees the blocks', (await blockCount(visitor)) === 2)
  check(
    'Visitor has no editing tools (zoom only)',
    (await visitor.getByTestId('tool-text').count()) === 0 &&
      (await visitor.getByTestId('zoom-in').isVisible()),
  )
  const onScreen = async (page, width, height) =>
    (
      await page
        .getByTestId('text-block')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
    ).every((r) => r.left >= 0 && r.right <= width && r.top >= 48 && r.bottom <= height)
  check(
    'Visitor sees the whole board on load (fit, max 100%)',
    (await onScreen(visitor, 1280, 800)) && Number.parseInt(await zoomText(visitor), 10) <= 100,
    await zoomText(visitor),
  )
  const vb = visitor.getByTestId('text-block').first()
  await vb.dblclick()
  check('Visitor double-click does not open an editor', (await editor(visitor).count()) === 0)
  check(
    'Visitor gets no resize grab areas',
    (await visitor.locator('[data-testid^="resize-"]').count()) === 0,
  )
  const v1 = await box(vb)
  await visitor.mouse.move(v1.x + 20, v1.y + 10)
  await visitor.mouse.down()
  await visitor.mouse.move(v1.x + 120, v1.y + 60, { steps: 5 })
  await visitor.mouse.up()
  const v2 = await box(vb)
  check(
    'Visitor dragging on a block pans the canvas (block itself stays)',
    v2.x === v1.x + 100 && v2.y === v1.y + 50,
    `${JSON.stringify(v1)} -> ${JSON.stringify(v2)}`,
  )
  const vSaved = await visitor.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  const vData = (await vSaved.json()).docs[0].data.canvas.objects
  check('Visitor actions change nothing on the server', vData.length === 2)
  await shot(visitor, 'visitor-view')

  // ---------- Server validation ----------
  const boardId = (
    await (await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)).json()
  ).docs[0].id
  const bad = await owner.request.patch(`${BASE}/api/boards/${boardId}`, {
    data: {
      data: {
        canvas: {
          objects: [
            { id: 'x', type: 'script', x: 0, y: 0, width: 10, height: 10, zIndex: 0, markdown: '' },
          ],
        },
      },
    },
  })
  check('Server rejects an unknown block type', bad.status() === 400, `status=${bad.status()}`)

  // ---------- Culling with many blocks ----------
  const many = []
  for (let i = 0; i < 300; i++) {
    many.push({
      id: `b${i}`,
      type: 'text',
      x: (i % 20) * 900,
      y: Math.floor(i / 20) * 700,
      width: 320,
      height: 60,
      zIndex: i,
      markdown: `# Block ${i}\nSome text for block ${i}`,
    })
  }
  const slug2 = await createBoard(owner, 'Big board')
  const id2 = (
    await (
      await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug2}&depth=0`)
    ).json()
  ).docs[0].id
  const putMany = await owner.request.patch(`${BASE}/api/boards/${id2}`, {
    data: { data: { canvas: { version: 1, viewport: { x: 40, y: 40, zoom: 1 }, objects: many } } },
  })
  check('300-block board saved', putMany.ok(), `status=${putMany.status()}`)
  await owner.goto(`${BASE}/b/${slug2}`, { waitUntil: 'networkidle' })
  await owner.getByTestId('text-block').first().waitFor()
  const mounted = await blockCount(owner)
  check(
    'Culling: only blocks near the screen are mounted',
    mounted > 0 && mounted < 40,
    `${mounted} of 300 mounted`,
  )
  const t0 = Date.now()
  for (let i = 0; i < 40; i++) await owner.mouse.wheel(150, 100)
  await owner.waitForTimeout(300)
  const panMs = Date.now() - t0
  const mounted2 = await blockCount(owner)
  const firstLabel = await owner.getByTestId('text-block').first().innerText()
  check(
    'Culling: panning far mounts a different set',
    !firstLabel.includes('Block 0\n') && mounted2 < 40,
    `${mounted2} mounted, first: ${firstLabel.split('\n')[0]}`,
  )
  check('40 pan steps over a 300-block board stay fast', panMs < 4000, `${panMs} ms`)
  await owner.getByTestId('zoom-fit').click()
  await owner.waitForTimeout(300)
  const mountedFit = await blockCount(owner)
  check(
    'Fit on a big board zooms out',
    Number.parseInt(await zoomText(owner), 10) < 20,
    `${await zoomText(owner)}, ${mountedFit} mounted`,
  )
  await shot(owner, 'big-board-fit')
  const heapBig = await heapMb(owner)
  await owner.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  await owner.getByTestId('text-block').first().waitFor()
  const heapSmall = await heapMb(owner)
  check(
    'Memory: 300 blocks (all on screen) add little JS heap',
    heapBig - heapSmall < 25,
    `2-block board ${heapSmall} MB, 300-block board ${heapBig} MB`,
  )

  // ---------- Mobile + dark ----------
  const m = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await m.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  await m.getByTestId('text-block').first().waitFor()
  check(
    'Mobile: canvas and zoom bar fit',
    !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)),
  )
  check('Mobile visitor sees every block on screen', await onScreen(m, 390, 844), await zoomText(m))
  await shot(m, 'mobile-visitor')
  await m.getByTestId('theme-toggle').click()
  await shot(m, 'mobile-visitor-dark')
  await m.getByTestId('theme-toggle').click()

  const unexpected = consoleErrors.filter(
    (e) => !e.includes('status of 404') && !e.includes('status of 400'),
  )
  check(
    'No unexpected browser console errors',
    unexpected.length === 0,
    `${unexpected.length} unexpected`,
  )
  for (const e of unexpected) console.log(`  ${e}`)
})
