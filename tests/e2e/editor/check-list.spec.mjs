// Task B6: check list — `[ ] ` / `[x] ` shortcuts (Payload ke), dabbe par click / keyboard se tick, Enter/Backspace,
// slash menu (Lists), Tab nesting, paste, Payload jaisi shakal, Save, visitor sirf dekhe
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Check list: shortcuts, ticking by click and keyboard, slash menu, nesting, paste, look, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'check_1')
  const slug = await createBoard(owner, 'Checklist lecture')
  const editor = owner.getByTestId('board-editor')
  const menu = owner.getByTestId('slash-menu')
  const settle = () => owner.waitForTimeout(80)
  // Har top-level element; check list ke liye har item [tick?, text] (tick: true/false, wrapper: null)
  const outline = (root = editor) =>
    root.evaluate((el) =>
      [...el.children].map((c) => {
        const tag = c.tagName.toLowerCase()
        if (tag === 'ul' && c.classList.contains('board-checklist'))
          return [
            'check',
            [...c.children].map((li) => [
              li.hasAttribute('aria-checked') ? li.getAttribute('aria-checked') === 'true' : null,
              li.innerText.replace(/\n$/, ''),
            ]),
          ]
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
  // Item ke dabbe (baen kinare ka ::before) par click
  const clickBox = async (index) => {
    const li = editor.locator('li[role="checkbox"]').nth(index)
    const box = await li.boundingBox()
    await owner.mouse.click(box.x + 8, box.y + 14)
    await settle()
  }

  // ---------- Shortcuts ----------
  await reset()
  await owner.keyboard.type('[ ] Read chapter 1')
  await settle()
  check(
    '"[ ] " at the start of a line starts a check list with an open box',
    await same([['check', [[false, 'Read chapter 1']]]]),
    JSON.stringify(await outline()),
  )
  await reset()
  await owner.keyboard.type('[x] Already done')
  await settle()
  check(
    '"[x] " starts a check list with a ticked box',
    await same([['check', [[true, 'Already done']]]]),
    JSON.stringify(await outline()),
  )
  await reset()
  // (`- [ ] ` type karte hue pehle `- ` bullet bana deta he — Payload me bhi; isliye shortcut `[ ] `)
  await owner.keyboard.type('[X] Capital X')
  await settle()
  check(
    '"[X] " (capital) also starts a ticked item',
    await same([['check', [[true, 'Capital X']]]]),
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Second')
  await settle()
  check(
    'Enter after a ticked item makes a new open item',
    await same([
      [
        'check',
        [
          [true, 'Capital X'],
          [false, 'Second'],
        ],
      ],
    ]),
    JSON.stringify(await outline()),
  )

  // ---------- Ticking ----------
  await reset()
  await owner.keyboard.type('[ ] Prepare slides')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Book the room')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Send the invite')
  await settle()
  await save(owner)
  await clickBox(0)
  check(
    'Clicking the box ticks the item',
    await same([
      [
        'check',
        [
          [true, 'Prepare slides'],
          [false, 'Book the room'],
          [false, 'Send the invite'],
        ],
      ],
    ]),
    JSON.stringify(await outline()),
  )
  await owner.getByTestId('unsaved-indicator').waitFor({ timeout: 3000 })
  check(
    'A tick is an unsaved change (Save keeps it)',
    await owner.getByTestId('unsaved-indicator').isVisible(),
  )
  await clickBox(0)
  check(
    'Clicking again removes the tick',
    (await outline())[0][1][0][0] === false,
    JSON.stringify(await outline()),
  )
  const second = editor.locator('li[role="checkbox"]').nth(1)
  await second.getByText('Book the room').click()
  await settle()
  check(
    'Clicking the text does not tick (only the box does)',
    (await outline())[0][1][1][0] === false,
  )
  await owner.keyboard.press('Home')
  await settle()
  await owner.keyboard.press('ArrowLeft')
  await settle()
  await owner.keyboard.press('Space')
  await settle()
  check(
    'Keyboard: at the start of an item, Left focuses the box and Space ticks it',
    (await outline())[0][1][1][0] === true &&
      (await editor.locator('li[role="checkbox"]').nth(1).innerText()).trim() === 'Book the room',
    JSON.stringify(await outline()),
  )
  await owner.keyboard.press('Escape')
  await settle()
  await clickBox(0)
  const look = (root) =>
    root.evaluate((el) => {
      const items = [...el.querySelectorAll('li[role="checkbox"]')]
      return items.map((li) => {
        const before = getComputedStyle(li, '::before')
        const after = getComputedStyle(li, '::after')
        const range = document.createRange()
        range.selectNodeContents(li)
        return {
          checked: li.getAttribute('aria-checked'),
          marker: getComputedStyle(li).listStyleType,
          box: [before.width, before.height, before.borderTopWidth],
          boxColor: before.backgroundColor,
          tick: after.content !== 'none' && after.display !== 'none',
          line: getComputedStyle(li).textDecorationLine,
          textX: Math.round(range.getBoundingClientRect().x - el.getBoundingClientRect().x),
        }
      })
    })
  const ownerLook = await look(editor)
  check(
    'Open box: 16 px with a border, no bullet, no line through the text',
    ownerLook[2].marker === 'none' &&
      JSON.stringify(ownerLook[2].box) === JSON.stringify(['16px', '16px', '1px']) &&
      !ownerLook[2].tick &&
      ownerLook[2].line === 'none',
    JSON.stringify(ownerLook[2]),
  )
  check(
    'Ticked item (Payload look): filled box with a tick mark, text struck through',
    ownerLook[0].checked === 'true' &&
      ownerLook[0].tick &&
      ownerLook[0].boxColor !== ownerLook[2].boxColor &&
      ownerLook[0].line === 'line-through',
    JSON.stringify(ownerLook[0]),
  )
  await owner.keyboard.press('ControlOrMeta+End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- Bullet for comparison')
  await settle()
  const bulletX = await editor.evaluate((el) => {
    const li = el.querySelector('ul:not(.board-checklist) li')
    const range = document.createRange()
    range.selectNodeContents(li)
    return Math.round(range.getBoundingClientRect().x - el.getBoundingClientRect().x)
  })
  check(
    'Check list text lines up with bullet list text',
    ownerLook.every((l) => l.textX === bulletX),
    `${bulletX} vs ${JSON.stringify(ownerLook.map((l) => l.textX))}`,
  )
  await shot(owner, 'check-list')

  // ---------- Backspace ----------
  await reset()
  await owner.keyboard.type('[ ] Only item')
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
  await owner.keyboard.type('/list')
  await menu.waitFor()
  check(
    'Slash menu "Lists" group: Unordered List, Ordered List, Check List (with an icon)',
    JSON.stringify(
      (await menu.getByRole('group', { name: 'Lists' }).getByRole('option').allInnerTexts()).map(
        (t) => t.trim(),
      ),
    ) === JSON.stringify(['Unordered List', 'Ordered List', 'Check List']) &&
      (await owner.getByTestId('slash-item-checkList').locator('svg').count()) === 1,
  )
  await shot(owner, 'slash-menu-lists')
  await owner.keyboard.press('Escape')
  for (const q of ['cl', 'checklist']) {
    await reset()
    await owner.keyboard.type(`/${q}`)
    await menu.waitFor()
    check(
      `"/${q}" finds only Check List`,
      (await menu.getByRole('option').count()) === 1 &&
        (await owner.getByTestId('slash-item-checkList').isVisible()),
    )
    await owner.keyboard.press('Escape')
  }
  await reset()
  await owner.keyboard.type('Grade homework /cl')
  await menu.waitFor()
  await settle()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Picking Check List turns the line into an open item and keeps its text',
    JSON.stringify((await outline()).map(([t, i]) => [t, i.map(([c, x]) => [c, x.trim()])])) ===
      JSON.stringify([['check', [[false, 'Grade homework']]]]),
    JSON.stringify(await outline()),
  )
  await reset()
  await owner.keyboard.type('1. First')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Second /cl')
  await menu.waitFor()
  await settle()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Check List inside a numbered list turns the whole list into a check list (Lexical)',
    (await editor.locator('ol').count()) === 0 &&
      JSON.stringify((await outline())[0][1].map(([c, x]) => [c, x.trim()])) ===
        JSON.stringify([
          [false, 'First'],
          [false, 'Second'],
        ]),
    JSON.stringify(await outline()),
  )

  // ---------- Tab nesting ----------
  await reset()
  await owner.keyboard.type('[ ] Week 1')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Intro video')
  await owner.keyboard.press('Tab')
  await settle()
  const nested = await editor.evaluate((el) =>
    [...el.querySelectorAll('li')].map((li) => ({
      box: li.getAttribute('role') === 'checkbox',
      before: getComputedStyle(li, '::before').display,
      text: li.innerText.trim(),
    })),
  )
  check(
    'Tab nests a check item; the wrapping item has no box of its own',
    nested.length === 3 &&
      nested[0].box &&
      !nested[1].box &&
      nested[1].before === 'none' &&
      nested[2].box &&
      nested[2].text === 'Intro video',
    JSON.stringify(nested),
  )
  await shot(owner, 'nested-check-list')

  // ---------- Undo ----------
  await reset()
  await owner.keyboard.type('[ ] Undo me')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  await owner.keyboard.press('ControlOrMeta+z')
  await settle()
  check(
    'Ctrl+Z (twice: text, then the shortcut) undoes the check list',
    (await editor.locator('.board-checklist').count()) === 0,
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
  await paste(
    '<ul __lexicallisttype="check"><li aria-checked="true">Done</li><li aria-checked="false">Open</li></ul>',
    'Done\nOpen',
  )
  await settle()
  check(
    'Pasted check list stays a check list with its ticks',
    (await outline()).some(
      ([t, i]) =>
        t === 'check' &&
        JSON.stringify(i) ===
          JSON.stringify([
            [true, 'Done'],
            [false, 'Open'],
          ]),
    ),
    JSON.stringify(await outline()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('## Before class')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('[ ] Read the notes')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Install Node')
  await owner.keyboard.press('Tab')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Install an editor')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Bring questions')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('See you in class.')
  await settle()
  await clickBox(0)
  await clickBox(1)
  const ownerOutline = await outline()
  check(
    'Board before saving: ticks on the first two items',
    JSON.stringify(ownerOutline) ===
      JSON.stringify([
        ['h2', 'Before class'],
        [
          'check',
          [
            [true, 'Read the notes'],
            [null, 'Install Node\nInstall an editor'],
            [false, 'Bring questions'],
          ],
        ],
        ['p', 'See you in class.'],
      ]),
    JSON.stringify(ownerOutline),
  )
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Ticks survive Save + reload',
    JSON.stringify(await outline()) === JSON.stringify(ownerOutline),
    JSON.stringify(await outline()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  check(
    'Visitor sees the same check list and ticks',
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
    'Visitor check list looks the same (boxes, ticks, line-through, positions)',
    JSON.stringify(await look(view)) === JSON.stringify(await look(editor)) &&
      JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await look(view))} vs ${JSON.stringify(await look(editor))}`,
  )
  const visitorItem = view.locator('li[role="checkbox"]').nth(2)
  const vbox = await visitorItem.boundingBox()
  await visitor.mouse.click(vbox.x + 8, vbox.y + 14)
  await visitor.waitForTimeout(150)
  check(
    'Visitor can only look: clicking a box changes nothing (owner)',
    (await visitorItem.getAttribute('aria-checked')) === 'false' &&
      (await visitorItem.getAttribute('aria-readonly')) === 'true',
  )
  await shot(visitor, 'visitor-check-list')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-check-list-dark')
  const darkLook = await look(editor)
  check(
    'Dark mode: the ticked box still differs from an open box',
    darkLook[0].boxColor !== darkLook[2].boxColor && darkLook[0].tick,
    JSON.stringify(darkLook),
  )

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const res = await owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
    data: {
      title: 'Checklist lecture',
      data: {
        doc: {
          root: {
            type: 'root',
            version: 1,
            children: [
              {
                type: 'list',
                listType: 'check',
                version: 1,
                children: [{ type: 'listitem', version: 1, checked: 'yes', children: [] }],
              },
            ],
          },
        },
      },
    },
  })
  const body = await res.json()
  check(
    'Server rejects a check item whose tick is not true/false',
    res.status() === 400 && /Invalid list item/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
