// Task B2: headings H1-H6 — markdown shortcut (`# `), slash menu, Enter/Backspace, paste, Save, read view
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Headings H1-H6: shortcuts, slash menu, Enter/Backspace, paste, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'heading_1')
  const slug = await createBoard(owner, 'Heading lecture')
  const editor = owner.getByTestId('board-editor')
  const menu = owner.getByTestId('slash-menu')
  const settle = () => owner.waitForTimeout(80)
  // Har top-level line: [tag, text]
  const lines = (root = editor) =>
    root.evaluate((el) =>
      [...el.children].map((c) => [c.tagName.toLowerCase(), c.innerText.replace(/\n$/, '')]),
    )
  const lastLine = async () => (await lines()).at(-1)
  const reset = async () => {
    await editor.click()
    await owner.keyboard.press('ControlOrMeta+a')
    await owner.keyboard.press('Backspace')
    await settle()
  }

  // ---------- Markdown shortcuts ----------
  await editor.click()
  for (let level = 1; level <= 6; level++) {
    await owner.keyboard.type(`${'#'.repeat(level)} Heading level ${level}`)
    await settle()
    const [tag, text] = await lastLine()
    check(
      `"${'#'.repeat(level)} " at the start of a line makes an H${level}`,
      tag === `h${level}` && text === `Heading level ${level}`,
      `${tag} ${JSON.stringify(text)}`,
    )
    await owner.keyboard.press('Enter')
    await settle()
    check(
      `Enter at the end of an H${level} starts a normal paragraph`,
      (await lastLine())[0] === 'p',
    )
  }
  await owner.keyboard.type('Body text under the headings.')
  await shot(owner, 'all-headings')

  // Size: H1 sab se bara, phir chhota hota jata he
  const sizes = await editor.evaluate((el) =>
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].map((t) =>
      Number.parseFloat(getComputedStyle(el.querySelector(t)).fontSize),
    ),
  )
  check(
    'Heading sizes go down from H1 to H6 (H6 not smaller than body text)',
    sizes.slice(0, 5).every((s, i) => s > sizes[i + 1]) && sizes[5] >= sizes[6],
    sizes.join(' / '),
  )

  await owner.keyboard.press('Enter')
  await owner.keyboard.type('#No space stays text')
  await settle()
  check('"#" without a space stays a paragraph', (await lastLine())[0] === 'p')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('####### Seven')
  await settle()
  check('Seven "#" is not a heading', (await lastLine())[0] === 'p')

  // ---------- Backspace / Enter in the middle ----------
  await reset()
  // Payload/Lexical jaisa: shuru me Backspace bhari heading ko nahi badalta, khali heading ko text bana deta he
  await owner.keyboard.type('## Keep me')
  await settle()
  await owner.keyboard.press('Home')
  await settle()
  await owner.keyboard.press('Backspace')
  await settle()
  check(
    'Backspace at the start of a heading with text keeps the heading (like Payload)',
    JSON.stringify(await lastLine()) === JSON.stringify(['h2', 'Keep me']),
    JSON.stringify(await lines()),
  )
  await owner.keyboard.press('End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('### ')
  await settle()
  check('"### " on an empty line makes an empty H3', (await lastLine())[0] === 'h3')
  await owner.keyboard.press('Backspace')
  await settle()
  check(
    'Backspace in an empty heading under another line removes that line',
    JSON.stringify(await lines()) === JSON.stringify([['h2', 'Keep me']]),
    JSON.stringify(await lines()),
  )
  await reset()
  await owner.keyboard.type('### ')
  await settle()
  await owner.keyboard.press('Backspace')
  await settle()
  check(
    'Backspace in an empty heading on the first line turns it into a paragraph',
    JSON.stringify((await lines()).map(([tag]) => tag)) === JSON.stringify(['p']),
    JSON.stringify(await lines()),
  )
  await reset()
  await owner.keyboard.type('# SplitHere')
  await settle()
  for (let i = 0; i < 4; i++) {
    await owner.keyboard.press('ArrowLeft')
    await settle()
  }
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Enter in the middle of a heading splits it into two headings',
    JSON.stringify(await lines()) ===
      JSON.stringify([
        ['h1', 'Split'],
        ['h1', 'Here'],
      ]),
    JSON.stringify(await lines()),
  )

  // ---------- Slash menu ----------
  await reset()
  await owner.keyboard.type('/heading')
  await menu.waitFor()
  check(
    'Slash menu lists Heading 1-6 in the Basic group, each with an icon',
    (await menu.getByRole('option', { name: /Heading \d/ }).count()) === 6 &&
      (await menu.locator('[data-testid^="slash-item-heading-"] svg').count()) === 6,
  )
  await shot(owner, 'slash-menu-headings')
  await owner.keyboard.press('Escape')
  await reset()
  await owner.keyboard.type('Chapter one /h3')
  await menu.waitFor()
  check(
    '"/h3" filters to Heading 3',
    (await menu.getByRole('option').count()) === 1 &&
      (await owner.getByTestId('slash-item-heading-3').isVisible()),
  )
  await owner.keyboard.press('Enter')
  await settle()
  check(
    // "/" se pehle wali space rehti he (Payload jaisa)
    'Picking Heading 3 turns the line into an H3 and keeps its text',
    (await lastLine())[0] === 'h3' && (await lastLine())[1].trim() === 'Chapter one',
    JSON.stringify(await lines()),
  )
  await owner.keyboard.type(' /para')
  await menu.waitFor()
  await owner.getByTestId('slash-item-paragraph').click()
  await settle()
  check(
    'Picking Paragraph turns a heading back into text',
    (await lastLine())[0] === 'p' && (await lastLine())[1].trim() === 'Chapter one',
    JSON.stringify(await lines()),
  )

  // ---------- Undo ----------
  await reset()
  await owner.keyboard.type('# Undo me')
  await settle()
  // Pehla Ctrl+Z likha text hatata he, doosra "# " wala heading (Lexical history)
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  check(
    'Ctrl+Z (twice: text, then the shortcut) undoes the heading',
    !(await lines()).some(([tag]) => tag === 'h1'),
    JSON.stringify(await lines()),
  )

  // ---------- Paste ----------
  await reset()
  await editor.evaluate((el) => {
    const data = new DataTransfer()
    data.setData('text/html', '<h2>Pasted heading</h2><p>Pasted text</p>')
    data.setData('text/plain', 'Pasted heading\nPasted text')
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
  })
  await settle()
  check(
    'Pasted H2 stays an H2',
    (await lines()).some(([tag, text]) => tag === 'h2' && text === 'Pasted heading'),
    JSON.stringify(await lines()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  for (let level = 1; level <= 6; level++) {
    await owner.keyboard.type(`${'#'.repeat(level)} Title ${level}`)
    await owner.keyboard.press('Enter')
  }
  await owner.keyboard.type('Closing paragraph')
  await settle()
  const ownerLines = await lines()
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Headings survive Save + reload',
    JSON.stringify(await lines()) === JSON.stringify(ownerLines),
    JSON.stringify(await lines()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  check(
    'Visitor sees the same headings (same tags and text)',
    JSON.stringify(await lines(view)) === JSON.stringify(ownerLines),
    JSON.stringify(await lines(view)),
  )
  const sizeOf = (page, root) =>
    root.evaluate((el) =>
      [...el.children].map((c) => `${getComputedStyle(c).fontSize}/${c.getBoundingClientRect().y}`),
    )
  check(
    'Visitor headings look the same as the owner sees them (size and position)',
    JSON.stringify(await sizeOf(visitor, view)) === JSON.stringify(await sizeOf(owner, editor)),
  )
  await shot(visitor, 'visitor-headings')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-headings-dark')

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const res = await owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
    data: {
      title: 'Heading lecture',
      data: {
        doc: {
          root: {
            type: 'root',
            version: 1,
            children: [{ type: 'heading', tag: 'h7', version: 1, children: [] }],
          },
        },
      },
    },
  })
  const body = await res.json()
  check(
    'Server rejects a heading level that does not exist (h7)',
    res.status() === 400 && /Invalid heading level/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
