// Task B3: quote — `> ` shortcut, slash menu (Blockquote), Shift+Enter/Enter/Backspace, paste, look,
// Save, visitor read view
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Quote: "> " shortcut, slash menu, keys, paste, look, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'quote_1')
  const slug = await createBoard(owner, 'Quote lecture')
  const editor = owner.getByTestId('board-editor')
  const menu = owner.getByTestId('slash-menu')
  const settle = () => owner.waitForTimeout(80)
  // Har top-level line: [tag, text]
  const lines = (root = editor) =>
    root.evaluate((el) =>
      [...el.children].map((c) => [c.tagName.toLowerCase(), c.innerText.replace(/\n$/, '')]),
    )
  const reset = async () => {
    await editor.click()
    await owner.keyboard.press('ControlOrMeta+a')
    await owner.keyboard.press('Backspace')
    await settle()
  }
  // Quote ka look: baen line, andar, italic (owner ka faisla)
  const look = (root) =>
    root.evaluate((el) => {
      const q = el.querySelector('blockquote')
      const p = el.querySelector('p')
      const qs = getComputedStyle(q)
      return {
        border: Number.parseFloat(qs.borderLeftWidth),
        padding: Number.parseFloat(qs.paddingLeft),
        italic: qs.fontStyle === 'italic',
        paragraphItalic: p ? getComputedStyle(p).fontStyle === 'italic' : false,
        otherBorders: [qs.borderTopWidth, qs.borderRightWidth, qs.borderBottomWidth],
      }
    })

  // ---------- Markdown shortcut ----------
  await editor.click()
  await owner.keyboard.type('Before the quote')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('> Knowledge is power')
  await settle()
  check(
    '"> " at the start of a line makes a quote',
    JSON.stringify((await lines()).at(-1)) === JSON.stringify(['blockquote', 'Knowledge is power']),
    JSON.stringify(await lines()),
  )
  await owner.keyboard.press('Shift+Enter')
  await owner.keyboard.type('- Francis Bacon')
  await settle()
  check(
    'Shift+Enter makes a new line inside the same quote',
    (await editor.locator('blockquote').count()) === 1 &&
      (await editor.locator('blockquote br').count()) >= 1,
    JSON.stringify(await lines()),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('After the quote')
  await settle()
  check(
    'Enter at the end of a quote starts a normal paragraph',
    JSON.stringify((await lines()).map(([tag]) => tag)) ===
      JSON.stringify(['p', 'blockquote', 'p']),
    JSON.stringify(await lines()),
  )
  const ownerLook = await look(editor)
  check(
    'Quote has a thin line on the left, is indented and italic',
    ownerLook.border > 0 && ownerLook.border <= 3 && ownerLook.padding >= 16 && ownerLook.italic,
    JSON.stringify(ownerLook),
  )
  check(
    'Only the left line (no line on top, right or bottom)',
    ownerLook.otherBorders.every((w) => w === '0px'),
    ownerLook.otherBorders.join(' / '),
  )
  check('Normal paragraphs are not italic', !ownerLook.paragraphItalic)
  await shot(owner, 'quote')

  // ---------- Kab nahi banta ----------
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('>No space stays text')
  await settle()
  check('">" without a space stays a paragraph', (await lines()).at(-1)[0] === 'p')

  // ---------- Backspace ----------
  await reset()
  await owner.keyboard.type('> Back to text')
  await settle()
  await owner.keyboard.press('Home')
  await settle()
  await owner.keyboard.press('Backspace')
  await settle()
  check(
    'Backspace at the start of a quote turns it back into a paragraph (text kept)',
    JSON.stringify(await lines()) === JSON.stringify([['p', 'Back to text']]),
    JSON.stringify(await lines()),
  )

  // ---------- Slash menu ----------
  await reset()
  await owner.keyboard.type('/quote')
  await menu.waitFor()
  const item = owner.getByTestId('slash-item-blockquote')
  check(
    '"/quote" finds "Blockquote" (with an icon) in the Basic group',
    (await item.isVisible()) &&
      (await item.innerText()).trim() === 'Blockquote' &&
      (await item.locator('svg').count()) === 1,
  )
  await shot(owner, 'slash-menu-blockquote')
  await owner.keyboard.press('Escape')
  await reset()
  await owner.keyboard.type('A wise line /blockquote')
  await menu.waitFor()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Picking Blockquote turns the line into a quote and keeps its text',
    (await lines())[0][0] === 'blockquote' && (await lines())[0][1].trim() === 'A wise line',
    JSON.stringify(await lines()),
  )
  await owner.keyboard.type(' /para')
  await menu.waitFor()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Slash menu > Paragraph turns a quote back into text',
    (await lines())[0][0] === 'p',
    JSON.stringify(await lines()),
  )

  // ---------- Undo ----------
  await reset()
  await owner.keyboard.type('> Undo me')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  check(
    'Ctrl+Z (twice: text, then the shortcut) undoes the quote',
    (await editor.locator('blockquote').count()) === 0,
    JSON.stringify(await lines()),
  )

  // ---------- Paste ----------
  await reset()
  await editor.evaluate((el) => {
    const data = new DataTransfer()
    data.setData('text/html', '<blockquote>Pasted quote</blockquote><p>Pasted text</p>')
    data.setData('text/plain', 'Pasted quote\nPasted text')
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
  })
  await settle()
  check(
    'Pasted blockquote stays a quote',
    (await lines()).some(([tag, text]) => tag === 'blockquote' && text === 'Pasted quote'),
    JSON.stringify(await lines()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('# Famous words')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('> The only way to learn is to do.')
  await owner.keyboard.press('Shift+Enter')
  await owner.keyboard.type('- a teacher')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Explanation paragraph.')
  await settle()
  const ownerLines = await lines()
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Quote survives Save + reload',
    JSON.stringify(await lines()) === JSON.stringify(ownerLines),
    JSON.stringify(await lines()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  check(
    'Visitor sees the same quote (tag, text, line break)',
    JSON.stringify(await lines(view)) === JSON.stringify(ownerLines) &&
      (await view.locator('blockquote br').count()) >= 1,
    JSON.stringify(await lines(view)),
  )
  const box = (root) =>
    root.evaluate((el) => {
      const r = el.querySelector('blockquote').getBoundingClientRect()
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]
    })
  check(
    'Visitor quote looks the same (line, italic, size and position)',
    JSON.stringify(await look(view)) === JSON.stringify(await look(editor)) &&
      JSON.stringify(await box(view)) === JSON.stringify(await box(editor)),
    `${JSON.stringify(await box(view))} vs ${JSON.stringify(await box(editor))}`,
  )
  await shot(visitor, 'visitor-quote')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-quote-dark')

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
