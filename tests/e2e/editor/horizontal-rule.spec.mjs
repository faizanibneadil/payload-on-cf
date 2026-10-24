// Task B7: horizontal rule — `--- ` shortcut, slash menu (Basic), click se select, Backspace/Delete,
// undo, paste, Payload jaisi shakal, Save, visitor read view
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Horizontal rule: shortcut, slash menu, select and delete, undo, paste, look, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'rule_1')
  const slug = await createBoard(owner, 'Sections lecture')
  const editor = owner.getByTestId('board-editor')
  const menu = owner.getByTestId('slash-menu')
  const settle = () => owner.waitForTimeout(80)
  // Har top-level element: [tag, text] (line ka text nahi)
  const outline = (root = editor) =>
    root.evaluate((el) =>
      [...el.children].map((c) => {
        const tag = c.tagName.toLowerCase()
        return tag === 'hr' ? ['hr'] : [tag, c.innerText.replace(/\n$/, '').trim()]
      }),
    )
  const same = async (expected, root = editor) =>
    JSON.stringify(await outline(root)) === JSON.stringify(expected)
  // Insaan jaisa click (dabane aur chhorne me ~100 ms): line select hone ke baad Lexical text par cursor
  // `selectionchange` se lagata he; Playwright ka foran wala click us se pehle khatam ho jata he
  const humanClick = async (locator) => {
    const b = await locator.boundingBox()
    await owner.mouse.move(b.x + 10, b.y + b.height / 2)
    await owner.mouse.down()
    await owner.waitForTimeout(100)
    await owner.mouse.up()
    await settle()
  }
  const reset = async () => {
    await editor.click()
    await owner.keyboard.press('ControlOrMeta+a')
    await owner.keyboard.press('Backspace')
    await settle()
  }

  // ---------- Shortcut ----------
  await reset()
  await owner.keyboard.type('Part one')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('---')
  await settle()
  check(
    '"---" alone stays text until a space is typed',
    (await editor.locator('hr').count()) === 0,
    JSON.stringify(await outline()),
  )
  await owner.keyboard.type(' ')
  await settle()
  await owner.keyboard.type('Part two')
  await settle()
  check(
    '"--- " at the start of a line makes a line, and typing goes on below it',
    await same([['p', 'Part one'], ['hr'], ['p', 'Part two']]),
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('---x ')
  await settle()
  check(
    '"---x " stays text',
    (await editor.locator('hr').count()) === 1 && (await outline()).at(-1)[1] === '---x',
    JSON.stringify(await outline()),
  )
  // Beech ki line me (neeche aur lines hon)
  await reset()
  await owner.keyboard.type('Top')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Bottom')
  await owner.keyboard.press('ArrowUp')
  await settle()
  await owner.keyboard.type('--- ')
  await settle()
  await owner.keyboard.type('Next')
  await settle()
  check(
    '"--- " on a line between others replaces that line; the cursor moves to the next line',
    await same([['p', 'Top'], ['hr'], ['p', 'NextBottom']]),
    JSON.stringify(await outline()),
  )
  const look = (root) =>
    root.evaluate((el) => {
      const hr = el.querySelector('hr')
      const s = getComputedStyle(hr)
      const after = getComputedStyle(hr, '::after')
      return {
        border: s.borderTopWidth,
        margin: [s.marginTop, s.marginBottom],
        line: [after.height, after.backgroundColor],
        height: Math.round(hr.getBoundingClientRect().height),
        page: getComputedStyle(document.body).backgroundColor,
      }
    })
  const ownerLook = await look(editor)
  check(
    'Look (Payload): a 2 px light grey line, 12 px space above and below, no border',
    ownerLook.border === '0px' &&
      JSON.stringify(ownerLook.margin) === JSON.stringify(['12px', '12px']) &&
      ownerLook.line[0] === '2px' &&
      ownerLook.line[1] !== ownerLook.page &&
      ownerLook.line[1] !== 'rgba(0, 0, 0, 0)',
    JSON.stringify(ownerLook),
  )
  await shot(owner, 'horizontal-rule')

  // ---------- Select, delete, undo ----------
  const hr = editor.locator('hr').first()
  await hr.click()
  await settle()
  check(
    'Clicking the line selects it (ring)',
    await hr.evaluate((el) => el.classList.contains('board-hr-selected')),
  )
  await shot(owner, 'selected-rule')
  await owner.keyboard.press('Backspace')
  await settle()
  check(
    'Backspace removes the selected line',
    (await editor.locator('hr').count()) === 0,
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  check(
    'Ctrl+Z brings it back (still selected)',
    (await editor.locator('hr').count()) === 1 &&
      (await editor
        .locator('hr')
        .first()
        .evaluate((el) => el.classList.contains('board-hr-selected'))),
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Delete')
  await settle()
  check('Delete removes the selected line too', (await editor.locator('hr').count()) === 0)
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  await humanClick(editor.getByText('NextBottom'))
  check(
    'After the line was selected, one click on text puts the cursor there',
    await editor.evaluate(() => getSelection().anchorNode?.textContent === 'NextBottom'),
  )
  await owner.keyboard.press('Home')
  await settle()
  await owner.keyboard.press('Backspace')
  await settle()
  check(
    'Backspace at the start of the line below removes the line (text stays, Lexical)',
    await same([
      ['p', 'Top'],
      ['p', 'NextBottom'],
    ]),
    JSON.stringify(await outline()),
  )

  // ---------- Slash menu ----------
  await reset()
  await owner.keyboard.type('/')
  await menu.waitFor()
  const basic = menu.getByRole('group', { name: 'Basic' })
  check(
    'Slash menu "Basic" group ends with "Horizontal Rule" (with an icon)',
    (await basic.getByRole('option').allInnerTexts()).map((t) => t.trim()).at(-1) ===
      'Horizontal Rule' &&
      (await owner.getByTestId('slash-item-horizontalRule').locator('svg').count()) === 1,
  )
  await owner.keyboard.type('hr')
  await settle()
  await shot(owner, 'slash-menu-hr')
  await owner.keyboard.press('Escape')
  for (const q of ['hr', 'rule', 'separator', 'line']) {
    await reset()
    await owner.keyboard.type(`/${q}`)
    await menu.waitFor()
    check(
      `"/${q}" finds only Horizontal Rule`,
      (await menu.getByRole('option').count()) === 1 &&
        (await owner.getByTestId('slash-item-horizontalRule').isVisible()),
    )
    await owner.keyboard.press('Escape')
  }
  // Owner (B7 fix): talash lafz ke shuru se — "r-ul-e" ka "ul" Horizontal Rule nahi laata
  await reset()
  await owner.keyboard.type('/ul')
  await menu.waitFor()
  check(
    '"/ul" finds only Unordered List, not Horizontal Rule',
    (await menu.getByRole('option').count()) === 1 &&
      (await owner.getByTestId('slash-item-unorderedList').isVisible()),
    (await menu.getByRole('option').allInnerTexts()).join(', '),
  )
  await shot(owner, 'slash-menu-ul')
  await owner.keyboard.press('Escape')
  await reset()
  await owner.keyboard.type('Intro /hr')
  await menu.waitFor()
  await owner.keyboard.press('Enter')
  await settle()
  await owner.keyboard.type('After')
  await settle()
  check(
    'Picking Horizontal Rule puts a line under the current line; typing goes on below it',
    await same([['p', 'Intro'], ['hr'], ['p', 'After']]),
    JSON.stringify(await outline()),
  )

  // ---------- Paste ----------
  const paste = (html, plain) =>
    editor.evaluate(
      (el, [h, p]) => {
        const data = new DataTransfer()
        data.setData('text/html', h)
        data.setData('text/plain', p)
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
      },
      [html, plain],
    )
  await reset()
  await paste('<p>Above</p><hr><p>Below</p>', 'Above\n---\nBelow')
  await settle()
  check(
    'Pasted <hr> stays a line',
    JSON.stringify((await outline()).filter(([t, x]) => t === 'hr' || x)) ===
      JSON.stringify([['p', 'Above'], ['hr'], ['p', 'Below']]),
    JSON.stringify(await outline()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('# Lecture 3')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Introduction text.')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('--- ')
  await owner.keyboard.type('## Part A')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- Point one')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('--- ')
  await owner.keyboard.type('Closing words.')
  await settle()
  const ownerOutline = await outline()
  check(
    'Lecture with two lines is built as expected',
    JSON.stringify(ownerOutline) ===
      JSON.stringify([
        ['h1', 'Lecture 3'],
        ['p', 'Introduction text.'],
        ['hr'],
        ['h2', 'Part A'],
        ['ul', 'Point one'],
        ['hr'],
        ['p', 'Closing words.'],
      ]),
    JSON.stringify(ownerOutline),
  )
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Lines survive Save + reload',
    JSON.stringify(await outline()) === JSON.stringify(ownerOutline),
    JSON.stringify(await outline()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  check(
    'Visitor sees the same lines',
    JSON.stringify(await outline(view)) === JSON.stringify(ownerOutline),
    JSON.stringify(await outline(view)),
  )
  const boxes = (root) =>
    root.evaluate((el) =>
      [...el.children].map((c) => {
        const r = c.getBoundingClientRect()
        return [c.tagName, Math.round(r.y), Math.round(r.height)]
      }),
    )
  check(
    'Visitor lines look the same and sit in the same positions',
    JSON.stringify(await look(view)) === JSON.stringify(await look(editor)) &&
      JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  await shot(visitor, 'visitor-rules')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-rules-dark')
  const dark = await look(editor)
  check(
    'Dark mode: the line is still visible against the page',
    dark.line[1] !== dark.page && dark.line[1] !== ownerLook.line[1],
    JSON.stringify(dark),
  )

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const res = await owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
    data: {
      title: 'Sections lecture',
      data: {
        doc: {
          root: {
            type: 'root',
            version: 1,
            children: [
              {
                type: 'horizontalrule',
                version: 1,
                children: [{ type: 'text', version: 1, text: 'x' }],
              },
            ],
          },
        },
      },
    },
  })
  const body = await res.json()
  check(
    'Server rejects a line with content inside',
    res.status() === 400 && /Invalid document part/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
