// Task B5: ordered (numbered) list — `1. ` shortcut (likha number = shuru number), Enter/Backspace,
// slash menu (Lists), bullet <-> numbered, paste, har level ka number style, Save, visitor read view
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Ordered list: shortcut, start number, Enter/Backspace, slash menu, paste, nesting, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'olist_1')
  const slug = await createBoard(owner, 'Numbered lecture')
  const editor = owner.getByTestId('board-editor')
  const menu = owner.getByTestId('slash-menu')
  const settle = () => owner.waitForTimeout(80)
  // Document ki shakal: har top-level element; list ke liye shuru number aur har item ka [number, text]
  const outline = (root = editor) =>
    root.evaluate((el) =>
      [...el.children].map((c) => {
        const tag = c.tagName.toLowerCase()
        if (tag === 'ol')
          return [
            tag,
            c.start,
            [...c.children].map((li) => [li.value, li.innerText.replace(/\n$/, '')]),
          ]
        if (tag === 'ul') return [tag, [...c.children].map((li) => li.innerText.replace(/\n$/, ''))]
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

  // ---------- Shortcut ----------
  await reset()
  await owner.keyboard.type('1. First')
  await settle()
  check(
    '"1. " at the start of a line starts a numbered list',
    await same([['ol', 1, [[1, 'First']]]]),
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Second')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Third')
  await settle()
  check(
    'Enter makes the next item, numbered 1, 2, 3',
    await same([
      [
        'ol',
        1,
        [
          [1, 'First'],
          [2, 'Second'],
          [3, 'Third'],
        ],
      ],
    ]),
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('After the list')
  await settle()
  check(
    'Enter on an empty item ends the list (normal paragraph after it)',
    (await outline()).at(-1)[0] === 'p' && (await outline()).at(-1)[1] === 'After the list',
    JSON.stringify(await outline()),
  )
  const look = (root) =>
    root.evaluate((el) => {
      const ol = el.querySelector('ol')
      const li = ol.querySelector('li')
      return {
        marker: getComputedStyle(ol).listStyleType,
        indent: Math.round(li.getBoundingClientRect().x - el.getBoundingClientRect().x),
        borders: [ol, li].map((n) => getComputedStyle(n).borderBottomWidth),
      }
    })
  const ownerLook = await look(editor)
  check(
    'Items show numbers (1. 2. 3.) and are indented like bullet lists',
    ownerLook.marker === 'decimal' && ownerLook.indent >= 16,
    JSON.stringify(ownerLook),
  )
  check(
    'No lines around the list',
    ownerLook.borders.every((w) => w === '0px'),
  )
  await shot(owner, 'numbered-list')

  await owner.keyboard.press('Enter')
  await owner.keyboard.type('1.No space stays text')
  await settle()
  check('"1." without a space stays a paragraph', (await outline()).at(-1)[0] === 'p')

  // ---------- Start number (owner: the typed number) ----------
  await reset()
  await owner.keyboard.type('3. Third step')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Fourth step')
  await settle()
  check(
    '"3. " starts the list at 3 (next item is 4)',
    await same([
      [
        'ol',
        3,
        [
          [3, 'Third step'],
          [4, 'Fourth step'],
        ],
      ],
    ]),
    JSON.stringify(await outline()),
  )
  await shot(owner, 'start-at-3')
  await reset()
  await owner.keyboard.type('0. Zero')
  await settle()
  check(
    '"0. " starts at 1 (start numbers are 1 to 9999)',
    await same([['ol', 1, [[1, 'Zero']]]]),
    JSON.stringify(await outline()),
  )

  // ---------- Backspace ----------
  await reset()
  await owner.keyboard.type('1. Only item')
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

  // ---------- Bullet and numbered side by side ----------
  await reset()
  await owner.keyboard.type('- Bullet')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('1. Number')
  await settle()
  check(
    'A numbered list right after a bullet list stays its own list',
    await same([
      ['ul', ['Bullet']],
      ['ol', 1, [[1, 'Number']]],
    ]),
    JSON.stringify(await outline()),
  )

  // ---------- Slash menu ----------
  await reset()
  await owner.keyboard.type('/')
  await menu.waitFor()
  const lists = menu.getByRole('group', { name: 'Lists' })
  check(
    'Slash menu "Lists" group has "Ordered List" right after "Unordered List" (with an icon)',
    JSON.stringify(
      (await lists.getByRole('option').allInnerTexts()).map((t) => t.trim()).slice(0, 2),
    ) === JSON.stringify(['Unordered List', 'Ordered List']) &&
      (await owner.getByTestId('slash-item-orderedList').locator('svg').count()) === 1,
  )
  await owner.keyboard.type('list')
  await settle()
  await shot(owner, 'slash-menu-lists')
  await owner.keyboard.press('Escape')
  for (const q of ['ol', 'numbered']) {
    await reset()
    await owner.keyboard.type(`/${q}`)
    await menu.waitFor()
    check(
      `"/${q}" finds only Ordered List`,
      (await menu.getByRole('option').count()) === 1 &&
        (await owner.getByTestId('slash-item-orderedList').isVisible()),
    )
    await owner.keyboard.press('Escape')
  }
  await reset()
  await owner.keyboard.type('Step one /ol')
  await menu.waitFor()
  await settle()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Picking Ordered List turns the line into item 1 and keeps its text',
    JSON.stringify(
      (await outline()).map(([t, n, i]) => [t, n, i?.map(([v, x]) => [v, x.trim()])]),
    ) === JSON.stringify([['ol', 1, [[1, 'Step one']]]]),
    JSON.stringify(await outline()),
  )
  await reset()
  await owner.keyboard.type('- Alpha')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Beta /ol')
  await menu.waitFor()
  await settle()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Ordered List inside a bullet list turns the whole list into a numbered list (Lexical)',
    (await editor.locator('ul').count()) === 0 &&
      JSON.stringify((await outline())[0][2].map(([n, t]) => [n, t.trim()])) ===
        JSON.stringify([
          [1, 'Alpha'],
          [2, 'Beta'],
        ]),
    JSON.stringify(await outline()),
  )
  await owner.keyboard.type('/ul')
  await menu.waitFor()
  await settle()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Unordered List inside a numbered list turns it back into bullets',
    (await editor.locator('ol').count()) === 0 && (await editor.locator('ul li').count()) === 2,
    JSON.stringify(await outline()),
  )

  // ---------- Undo ----------
  await reset()
  await owner.keyboard.type('1. Undo me')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  check(
    'Ctrl+Z (twice: text, then the shortcut) undoes the list',
    (await editor.locator('ol').count()) === 0,
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
  await paste('<ol><li>One</li><li>Two</li></ol>', 'One\nTwo')
  await settle()
  check(
    'Pasted numbered list stays a numbered list',
    (await outline()).some(
      ([t, s, i]) =>
        t === 'ol' &&
        s === 1 &&
        JSON.stringify(i) ===
          JSON.stringify([
            [1, 'One'],
            [2, 'Two'],
          ]),
    ),
    JSON.stringify(await outline()),
  )
  await reset()
  await paste('<ol start="5"><li>Five</li><li>Six</li></ol>', 'Five\nSix')
  await settle()
  check(
    'Pasted <ol start="5"> keeps its start number',
    (await outline()).some(([t, s, i]) => t === 'ol' && s === 5 && i[1]?.[0] === 6),
    JSON.stringify(await outline()),
  )

  // ---------- Save, reload, visitor (with a nested list from paste: one style per level) ----------
  await reset()
  await owner.keyboard.type('## Steps')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('1. Install the tools')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Write the code')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Then nested levels:')
  await owner.keyboard.press('Enter')
  await settle()
  // 6 level: har level me ek item, aur agla level ek wrapper item (<li><ol>) me
  const level = (n) => `<ol><li>Level ${n}</li>${n < 6 ? `<li>${level(n + 1)}</li>` : ''}</ol>`
  await paste(level(1), 'Level 1')
  await settle()
  const styles = (root) =>
    root.evaluate((el) =>
      [...el.querySelectorAll('ol')].map((ol) => getComputedStyle(ol).listStyleType),
    )
  const levels = await styles(editor)
  check(
    'Each nested level has its own number style: 1. A. a. I. i. then 1. again (Payload)',
    JSON.stringify(levels.slice(-6)) ===
      JSON.stringify([
        'decimal',
        'upper-alpha',
        'lower-alpha',
        'upper-roman',
        'lower-roman',
        'decimal',
      ]),
    JSON.stringify(levels),
  )
  await shot(owner, 'nested-levels')
  const ownerOutline = await outline()
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Numbered list survives Save + reload',
    JSON.stringify(await outline()) === JSON.stringify(ownerOutline),
    JSON.stringify(await outline()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  check(
    'Visitor sees the same lists and numbers',
    JSON.stringify(await outline(view)) === JSON.stringify(ownerOutline),
    JSON.stringify(await outline(view)),
  )
  const boxes = (root) =>
    root.evaluate((el) =>
      [...el.querySelectorAll('li')].map((li) => {
        const r = li.getBoundingClientRect()
        return [li.value, Math.round(r.x), Math.round(r.y), Math.round(r.height)]
      }),
    )
  check(
    'Visitor lists look the same (number styles per level, item numbers, positions)',
    JSON.stringify(await styles(view)) === JSON.stringify(await styles(editor)) &&
      JSON.stringify(await look(view)) === JSON.stringify(await look(editor)) &&
      JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  await shot(visitor, 'visitor-numbered-list')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-numbered-list-dark')

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const res = await owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
    data: {
      title: 'Numbered lecture',
      data: {
        doc: {
          root: {
            type: 'root',
            version: 1,
            children: [
              {
                type: 'list',
                listType: 'number',
                start: 0,
                version: 1,
                children: [{ type: 'listitem', version: 1, value: 0, children: [] }],
              },
            ],
          },
        },
      },
    },
  })
  const body = await res.json()
  check(
    'Server rejects a numbered list with a start number outside 1-9999',
    res.status() === 400 && /Invalid list start/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
