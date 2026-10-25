// Task A3: board = ek Lexical document. Owner likhta hai (sirf paragraphs), Save/reload, visitor ka
// server read view (Lexical JS nahi), server validation, unsaved indicator
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Board editor basics: write, save, reload, visitor read view, validation', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'editor_1')
  const slug = await createBoard(owner, 'Lecture one')
  const editor = owner.getByTestId('board-editor')
  const unsaved = owner.getByTestId('unsaved-indicator')
  const paragraphs = () =>
    editor.evaluate((el) => [...el.querySelectorAll(':scope > p')].map((p) => p.innerText))
  // Selection badalne ke baad Lexical ko sync hone ka waqt (insaan itni tezi se nahi dabata)
  const settle = () => owner.waitForTimeout(80)

  // ---------- Khali board ----------
  check('New board opens the editor', await editor.isVisible())
  check('Editor is editable', (await editor.getAttribute('contenteditable')) === 'true')
  check(
    'Empty board shows the placeholder',
    await owner.getByText('Start writing your lecture...').isVisible(),
  )
  const ph = await owner.getByText('Start writing your lecture...').boundingBox()
  const ed = await editor.boundingBox()
  check(
    'Placeholder sits exactly where the text starts',
    Math.abs(ph.x - ed.x) <= 2 && Math.abs(ph.y - ed.y) <= 2,
    `placeholder ${Math.round(ph.x)},${Math.round(ph.y)} editor ${Math.round(ed.x)},${Math.round(ed.y)}`,
  )
  // Khaali jagah (text ke neeche) par click bhi editor me le jaye
  await owner.mouse.click(ed.x + 200, ed.y + 300)
  check(
    'Clicking the empty area below the text focuses the editor',
    await editor.evaluate((el) => el === document.activeElement),
  )
  await owner.waitForTimeout(500)
  check('Opening a board is not an unsaved change', (await unsaved.count()) === 0)
  check('No canvas left on the page', (await owner.getByTestId('canvas-surface').count()) === 0)
  await shot(owner, 'empty-board')

  // ---------- Likhna ----------
  await editor.click()
  await owner.keyboard.type('First paragraph')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Second paragraph')
  check(
    'Typing creates paragraphs (Enter = new paragraph)',
    JSON.stringify(await paragraphs()) === JSON.stringify(['First paragraph', 'Second paragraph']),
    JSON.stringify(await paragraphs()),
  )
  check(
    'Placeholder hides once there is text',
    (await owner.getByText('Start writing your lecture...').count()) === 0,
  )
  await unsaved.waitFor()
  check('Typing shows "Unsaved changes"', await unsaved.isVisible())

  await owner.keyboard.press('Shift+Enter')
  await owner.keyboard.type('same paragraph')
  check(
    'Shift+Enter makes a line break inside the paragraph',
    (await paragraphs()).length === 2 && (await editor.locator('p br').count()) >= 1,
    JSON.stringify(await paragraphs()),
  )

  // ---------- Baqi formatting abhi band (bold C2, italic C3, underline C4 se; strikethrough waghera apne
  // task me — un ka koi keyboard shortcut nahi, is liye sirf paste se check) ----------
  await owner.keyboard.type(' plain')
  await settle()
  await owner.keyboard.press('Enter')
  await settle()
  await editor.evaluate((el) => {
    const data = new DataTransfer()
    data.setData(
      'text/html',
      '<p>Pasted <b>bold</b></p><p style="color:red">red <i>it</i> <u>under</u> <s>gone</s> <code>x</code></p>',
    )
    data.setData('text/plain', 'Pasted bold\nred it under gone x')
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
  })
  await settle()
  const pastedHtml = await editor.innerHTML()
  check(
    // Headings B2, bold C2, italic C3, underline C4 se paste me rehte hain; strikethrough/code/rang abhi nahi
    'Pasted rich text keeps bold, italic and underline but drops strikethrough, code and colours',
    /Pasted bold/.test(await editor.innerText()) &&
      /<strong\b/.test(pastedHtml) &&
      /<em\b/.test(pastedHtml) &&
      /underline/.test(pastedHtml) &&
      !/<s\b|line-through|<code\b/.test(pastedHtml) &&
      !/color/.test(pastedHtml),
    pastedHtml.slice(0, 300),
  )
  await shot(owner, 'owner-writing')

  // ---------- Undo / redo ----------
  const beforeUndo = await editor.innerText()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  const afterUndo = await editor.innerText()
  check('Ctrl+Z undoes the last change', afterUndo !== beforeUndo)
  await owner.keyboard.press('ControlOrMeta+Shift+z')
  await settle()
  check('Ctrl+Shift+Z redoes it', (await editor.innerText()) === beforeUndo)

  // ---------- Save + reload ----------
  await save(owner)
  check('Save clears "Unsaved changes"', (await unsaved.count()) === 0)
  const savedText = await editor.innerText()
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Text survives Save + reload',
    (await editor.innerText()) === savedText,
    JSON.stringify(await editor.innerText()),
  )
  await owner.waitForTimeout(500)
  check('Reloaded board is not dirty', (await unsaved.count()) === 0)

  // Ctrl+S editor ke andar se (abhi type hua text bhi)
  await editor.click()
  await owner.keyboard.press('ControlOrMeta+End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Saved with Ctrl+S')
  await owner.keyboard.press('ControlOrMeta+s')
  await unsaved.waitFor({ state: 'detached' })
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Ctrl+S inside the editor saves the text typed just before',
    /Saved with Ctrl\+S/.test(await editor.innerText()),
  )

  // Page ka HTML server par bana (editor ka chunk aane se pehle bhi text dikhta hai)
  const html = await (await owner.request.get(`${BASE}/b/${slug}`)).text()
  check(
    'Owner page HTML already contains the text (server read view before the editor loads)',
    html.includes('document-view') && html.includes('First paragraph'),
  )

  // ---------- Visitor ----------
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  check('Visitor sees the document', await view.isVisible())
  check(
    'Visitor sees the saved text',
    /First paragraph/.test(await view.innerText()) &&
      /Saved with Ctrl\+S/.test(await view.innerText()),
  )
  check(
    'Visitor gets no editor (nothing editable)',
    (await visitor.locator('[contenteditable]').count()) === 0,
  )
  check(
    'Visitor paragraphs match the owner view',
    (await view.locator(':scope > p').count()) === (await editor.locator(':scope > p').count()),
  )
  await shot(visitor, 'visitor-read-view')
  await visitor.setViewportSize({ width: 390, height: 800 })
  await shot(visitor, 'visitor-mobile')

  // Dark theme
  await owner.getByTestId('theme-toggle').click()
  await owner.waitForTimeout(300)
  await shot(owner, 'owner-dark')
  await owner.getByTestId('theme-toggle').click()

  // Khali shared board: visitor ko saaf message
  const emptySlug = await createBoard(owner, 'Empty lecture')
  await share(owner)
  await visitor.goto(`${BASE}/b/${emptySlug}`, { waitUntil: 'networkidle' })
  check(
    'Visitor of an empty board sees "This board is empty."',
    await visitor.getByTestId('empty-board').isVisible(),
  )

  // ---------- Server validation (Save endpoint) ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const id = board.docs[0].id
  const post = (data) =>
    owner.request.post(`${BASE}/api/boards/${id}/save`, { data: { title: 'Lecture one', data } })
  let res = await post({
    doc: { root: { type: 'root', version: 1, children: [{ type: 'script', version: 1 }] } },
  })
  let body = await res.json()
  check(
    'Server rejects an unknown document part',
    res.status() === 400 && /Unknown document part/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )
  res = await post({ canvas: { version: 1, objects: [] } })
  body = await res.json()
  check(
    'Server rejects the old canvas format',
    res.status() === 400 && /Unknown board data/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )
  await owner.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  await owner.getByTestId('board-editor').waitFor()
  check(
    'Rejected saves leave the board unchanged',
    /First paragraph/.test(await owner.getByTestId('board-editor').innerText()),
  )

  // ---------- Lamba document: page scroll hota hai ----------
  const emptyBoard = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${emptySlug}&depth=0`)
  ).json()
  const many = Array.from({ length: 80 }, (_, i) => ({
    type: 'paragraph',
    version: 1,
    children: [{ type: 'text', version: 1, text: `Line ${i + 1}`, format: 0 }],
  }))
  res = await owner.request.post(`${BASE}/api/boards/${emptyBoard.docs[0].id}/save`, {
    data: {
      title: 'Empty lecture',
      data: { doc: { root: { type: 'root', version: 1, children: many } } },
    },
  })
  check('A long document saves', res.ok(), `status=${res.status()}`)
  await visitor.goto(`${BASE}/b/${emptySlug}`, { waitUntil: 'networkidle' })
  await visitor.getByTestId('board-page').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  check(
    'A long document scrolls to its last line',
    await visitor.getByText('Line 80', { exact: true }).isVisible(),
  )
  await shot(visitor, 'visitor-long-document-bottom')

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
