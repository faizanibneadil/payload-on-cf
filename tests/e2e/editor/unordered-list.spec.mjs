// Task B4: unordered (bullet) list — `- ` `* ` `+ ` shortcuts, Enter/Backspace, slash menu (Lists),
// paste, look, Save, visitor read view
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Unordered list: shortcuts, Enter/Backspace, slash menu, paste, look, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'list_1')
  const slug = await createBoard(owner, 'List lecture')
  const editor = owner.getByTestId('board-editor')
  const menu = owner.getByTestId('slash-menu')
  const settle = () => owner.waitForTimeout(80)
  // Document ki shakal: har top-level element; list ke liye uske items ka text
  const outline = (root = editor) =>
    root.evaluate((el) =>
      [...el.children].map((c) => {
        const tag = c.tagName.toLowerCase()
        if (tag === 'ul' || tag === 'ol')
          return [tag, [...c.children].map((li) => li.innerText.replace(/\n$/, ''))]
        return [tag, c.innerText.replace(/\n$/, '')]
      }),
    )
  const same = async (expected, root = editor) =>
    JSON.stringify(await outline(root)) === JSON.stringify(expected)
  const reset = async () => {
    await editor.click()
    await owner.keyboard.press('ControlOrMeta+a')
    await owner.keyboard.press('Backspace')
    await settle()
  }

  // ---------- Shortcuts ----------
  for (const marker of ['-', '*', '+']) {
    await reset()
    await owner.keyboard.type(`${marker} First`)
    await settle()
    check(
      `"${marker} " at the start of a line starts a bullet list`,
      await same([['ul', ['First']]]),
      JSON.stringify(await outline()),
    )
  }
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Second')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Third')
  await settle()
  check(
    'Enter makes a new item in the same list',
    await same([['ul', ['First', 'Second', 'Third']]]),
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('After the list')
  await settle()
  check(
    'Enter on an empty item ends the list (normal paragraph after it)',
    await same([
      ['ul', ['First', 'Second', 'Third']],
      ['p', 'After the list'],
    ]),
    JSON.stringify(await outline()),
  )
  const look = (root) =>
    root.evaluate((el) => {
      const ul = el.querySelector('ul')
      const li = ul.querySelector('li')
      return {
        marker: getComputedStyle(li).listStyleType || getComputedStyle(ul).listStyleType,
        indent: Math.round(li.getBoundingClientRect().x - el.getBoundingClientRect().x),
        borders: [ul, li].map((n) => getComputedStyle(n).borderBottomWidth),
      }
    })
  const ownerLook = await look(editor)
  check(
    'Items show round bullets and are indented',
    ownerLook.marker === 'disc' && ownerLook.indent >= 16,
    JSON.stringify(ownerLook),
  )
  check(
    'No lines around the list',
    ownerLook.borders.every((w) => w === '0px'),
  )
  await shot(owner, 'bullet-list')

  await owner.keyboard.press('Enter')
  await owner.keyboard.type('-No space stays text')
  await settle()
  check('"-" without a space stays a paragraph', (await outline()).at(-1)[0] === 'p')

  // ---------- Backspace ----------
  await reset()
  await owner.keyboard.type('- Only item')
  await settle()
  await owner.keyboard.press('Home')
  await settle()
  await owner.keyboard.press('Backspace')
  await settle()
  check(
    'Backspace at the start of the first item turns it back into a paragraph (text kept)',
    await same([['p', 'Only item']]),
    JSON.stringify(await outline()),
  )

  // ---------- Slash menu ----------
  await reset()
  await owner.keyboard.type('/')
  await menu.waitFor()
  check(
    'Slash menu has a "Lists" group with "Unordered List" (with an icon)',
    (await menu.getByRole('group', { name: 'Lists' }).isVisible()) &&
      (await owner.getByTestId('slash-item-unorderedList').innerText()).trim() ===
        'Unordered List' &&
      (await owner.getByTestId('slash-item-unorderedList').locator('svg').count()) === 1,
  )
  await shot(owner, 'slash-menu-lists')
  await owner.keyboard.press('Escape')
  await reset()
  await owner.keyboard.type('Topic one /bullet')
  await menu.waitFor()
  check(
    '"/bullet" finds Unordered List',
    (await menu.getByRole('option').count()) === 1 &&
      (await owner.getByTestId('slash-item-unorderedList').isVisible()),
  )
  await owner.keyboard.press('Enter')
  await settle()
  const [tag, items] = (await outline())[0]
  check(
    'Picking Unordered List turns the line into a list item and keeps its text',
    tag === 'ul' && items.length === 1 && items[0].trim() === 'Topic one',
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Topic two')
  await settle()
  check(
    'Typing goes on in the list',
    JSON.stringify((await outline())[0][1].map((t) => t.trim())) ===
      JSON.stringify(['Topic one', 'Topic two']),
  )

  // ---------- Undo ----------
  await reset()
  await owner.keyboard.type('- Undo me')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  check(
    'Ctrl+Z (twice: text, then the shortcut) undoes the list',
    (await editor.locator('ul').count()) === 0,
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
  await paste('<ul><li>Pasted A</li><li>Pasted B</li></ul>', 'Pasted A\nPasted B')
  await settle()
  check(
    'Pasted bullet list stays a list',
    (await outline()).some(
      ([t, i]) => t === 'ul' && JSON.stringify(i) === JSON.stringify(['Pasted A', 'Pasted B']),
    ),
    JSON.stringify(await outline()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('## Key points')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- Variables hold values')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Functions take inputs')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Loops repeat work')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Summary paragraph.')
  await settle()
  const ownerOutline = await outline()
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'List survives Save + reload',
    JSON.stringify(await outline()) === JSON.stringify(ownerOutline),
    JSON.stringify(await outline()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  check(
    'Visitor sees the same list',
    JSON.stringify(await outline(view)) === JSON.stringify(ownerOutline),
    JSON.stringify(await outline(view)),
  )
  const boxes = (root) =>
    root.evaluate((el) =>
      [...el.querySelectorAll('li')].map((li) => {
        const r = li.getBoundingClientRect()
        return [Math.round(r.x), Math.round(r.y), Math.round(r.height)]
      }),
    )
  check(
    'Visitor list looks the same (bullets, indent, positions)',
    JSON.stringify(await look(view)) === JSON.stringify(await look(editor)) &&
      JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  await shot(visitor, 'visitor-list')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-list-dark')

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const res = await owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
    data: {
      title: 'List lecture',
      data: {
        doc: {
          root: {
            type: 'root',
            version: 1,
            children: [
              {
                type: 'list',
                listType: 'bullet',
                version: 1,
                children: [{ type: 'paragraph', version: 1, children: [] }],
              },
            ],
          },
        },
      },
    },
  })
  const body = await res.json()
  check(
    'Server rejects a list whose children are not list items',
    res.status() === 400 && /Invalid list/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
