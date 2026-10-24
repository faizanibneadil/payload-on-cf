// Task B8: indent — paragraph, heading, quote: Tab / Shift+Tab (Payload default), text ke beech tab,
// hadd, Backspace, Enter, undo, list nesting pehle jaisi, Escape+Tab se bahar, paste, Save, visitor, server
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

// Owner (B8): ek level 24px, hadd 15 level (0 se 14, list ki nesting jitni)
const STEP = 24
const MAX_INDENT = 14

test('Indent: Tab / Shift+Tab on paragraphs, headings and quotes, limit, keys, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'indent_1')
  const slug = await createBoard(owner, 'Indent lecture')
  const editor = owner.getByTestId('board-editor')
  const settle = () => owner.waitForTimeout(80)
  // Har line: [tag, andar ki padding, baen margin, text]
  const lines = (root = editor) =>
    root.evaluate((el) =>
      [...el.children].map((n) => {
        const s = getComputedStyle(n)
        return [
          n.tagName.toLowerCase(),
          Math.round(Number.parseFloat(s.paddingLeft)),
          Math.round(Number.parseFloat(s.marginLeft)),
          n.innerText.replace(/\n$/, ''),
        ]
      }),
    )
  const same = async (expected, root = editor) =>
    JSON.stringify(await lines(root)) === JSON.stringify(expected)
  const reset = async () => {
    await editor.click()
    await owner.keyboard.press('ControlOrMeta+a')
    await owner.keyboard.press('Backspace')
    await settle()
  }
  const press = async (key) => {
    await owner.keyboard.press(key)
    await settle()
  }
  const inEditor = () =>
    editor.evaluate((el) => el === document.activeElement || el.contains(document.activeElement))

  // ---------- Paragraph ----------
  await reset()
  await owner.keyboard.type('Plain paragraph')
  await press('Home')
  await press('Tab')
  check(
    'Tab at the start of a paragraph moves the whole line in by 24 px',
    await same([['p', STEP, 0, 'Plain paragraph']]),
    JSON.stringify(await lines()),
  )
  check('The cursor stays in the editor after Tab', await inEditor())
  await press('Tab')
  check(
    'Tab again: two levels (48 px)',
    await same([['p', 2 * STEP, 0, 'Plain paragraph']]),
    JSON.stringify(await lines()),
  )
  await press('Shift+Tab')
  check(
    'Shift+Tab: one level back out',
    await same([['p', STEP, 0, 'Plain paragraph']]),
    JSON.stringify(await lines()),
  )
  await press('End')
  await press('Shift+Tab')
  check(
    'Shift+Tab also works with the cursor at the end of the line (never inserts a tab)',
    await same([['p', 0, 0, 'Plain paragraph']]),
    JSON.stringify(await lines()),
  )
  await press('Shift+Tab')
  check(
    'Shift+Tab on a line that is not indented changes nothing',
    await same([['p', 0, 0, 'Plain paragraph']]),
    JSON.stringify(await lines()),
  )

  // ---------- Tab inside text ----------
  await reset()
  await owner.keyboard.type('Name')
  await press('Tab')
  await owner.keyboard.type('Value')
  await settle()
  const tabbed = await editor.evaluate((el) => ({
    text: el.querySelector('p').textContent,
    padding: el.querySelector('p').style.paddingInlineStart,
    tabSize: getComputedStyle(el).tabSize,
  }))
  check(
    'Tab in the middle of text inserts a tab character and does not indent the line',
    tabbed.text === 'Name\tValue' && tabbed.padding === '',
    JSON.stringify(tabbed),
  )
  check('A tab is 4 characters wide', tabbed.tabSize === '4', tabbed.tabSize)

  // ---------- Heading and quote ----------
  await reset()
  await owner.keyboard.type('## Chapter one')
  await press('Home')
  await press('Tab')
  await press('End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('> Knowledge is power')
  await press('Home')
  await press('Tab')
  await settle()
  const quoteBox = await editor.evaluate((el) => {
    const q = el.querySelector('blockquote')
    const s = getComputedStyle(q)
    return {
      x: Math.round(q.getBoundingClientRect().x - el.getBoundingClientRect().x),
      border: Number.parseFloat(s.borderLeftWidth),
    }
  })
  check(
    'Tab indents a heading (padding) and a whole quote, its line too (margin), by 24 px',
    await same([
      ['h2', STEP, 0, 'Chapter one'],
      ['blockquote', STEP, STEP, 'Knowledge is power'],
    ]),
    JSON.stringify(await lines()),
  )
  check(
    'The quote keeps its thin line and its own inner space; the line moved in with it',
    quoteBox.x === STEP && quoteBox.border > 0 && quoteBox.border <= 3,
    JSON.stringify(quoteBox),
  )
  await press('Shift+Tab')
  check(
    'Shift+Tab brings the quote back to the left edge',
    (await lines())[1].join() === ['blockquote', STEP, 0, 'Knowledge is power'].join(),
    JSON.stringify(await lines()),
  )
  await shot(owner, 'heading-quote-indent')

  // ---------- Several lines ----------
  await reset()
  await owner.keyboard.type('One')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Two')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Three')
  await settle()
  await press('ControlOrMeta+a')
  await press('Tab')
  check(
    'Tab with several lines selected indents all of them',
    await same([
      ['p', STEP, 0, 'One'],
      ['p', STEP, 0, 'Two'],
      ['p', STEP, 0, 'Three'],
    ]),
    JSON.stringify(await lines()),
  )
  await press('Shift+Tab')
  check(
    'Shift+Tab with several lines selected brings all of them out',
    await same([
      ['p', 0, 0, 'One'],
      ['p', 0, 0, 'Two'],
      ['p', 0, 0, 'Three'],
    ]),
    JSON.stringify(await lines()),
  )

  // ---------- Limit ----------
  await reset()
  await owner.keyboard.type('Deep line')
  await press('Home')
  for (let i = 0; i < 20; i++) await owner.keyboard.press('Tab')
  await settle()
  check(
    'Tab stops at 15 levels (14 steps, 336 px); extra Tabs do nothing',
    await same([['p', MAX_INDENT * STEP, 0, 'Deep line']]),
    JSON.stringify(await lines()),
  )
  const savedDeep = await save(owner).then(
    () => true,
    (e) => String(e),
  )
  check(
    'A line indented to the limit saves without an error',
    savedDeep === true,
    String(savedDeep),
  )

  // ---------- Enter, Backspace, undo ----------
  await reset()
  await owner.keyboard.type('First')
  await press('Home')
  await press('Tab')
  await press('End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Second')
  await settle()
  const afterEnter = await lines()
  check(
    'Enter at the end of an indented line starts a line without indent (Lexical/Payload)',
    JSON.stringify(afterEnter) ===
      JSON.stringify([
        ['p', STEP, 0, 'First'],
        ['p', 0, 0, 'Second'],
      ]),
    JSON.stringify(afterEnter),
  )
  await press('Home')
  await press('Tab')
  await press('Tab')
  await press('Backspace')
  check(
    'Backspace at the start of an indented line moves it one level out first (Lexical)',
    await same([
      ['p', STEP, 0, 'First'],
      ['p', STEP, 0, 'Second'],
    ]),
    JSON.stringify(await lines()),
  )
  await press('ControlOrMeta+z')
  check(
    'Ctrl+Z brings the indent back',
    (await lines())[1].join() === ['p', 2 * STEP, 0, 'Second'].join(),
    JSON.stringify(await lines()),
  )
  await press('ControlOrMeta+Shift+z')
  check(
    'Ctrl+Shift+Z redoes it',
    (await lines())[1].join() === ['p', STEP, 0, 'Second'].join(),
    JSON.stringify(await lines()),
  )

  // ---------- Lists unchanged ----------
  await reset()
  await owner.keyboard.type('- Tools')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Hammer')
  await settle()
  await press('Tab')
  const nested = await editor.evaluate((el) => ({
    depth: el.querySelectorAll('ul ul').length,
    padding: [...el.querySelectorAll('li')].map((li) => li.style.paddingInlineStart),
  }))
  check(
    'Tab in a list still makes a nested list (no extra padding on the item)',
    nested.depth === 1 && nested.padding.every((p) => p === ''),
    JSON.stringify(nested),
  )
  await press('End')
  await press('Tab')
  check(
    'Tab at the end of a list item also nests (no tab character in lists)',
    (await editor.evaluate((el) => el.querySelectorAll('ul ul ul').length)) === 1 &&
      !(await editor.innerText()).includes('\t'),
  )

  // ---------- Leaving the editor from the keyboard ----------
  await reset()
  await owner.keyboard.type('Leave me')
  await settle()
  await press('Escape')
  await press('Shift+Tab')
  const leftBack = await owner.evaluate(() => ({
    tag: document.activeElement?.tagName,
    testid: document.activeElement?.closest('[data-testid]')?.getAttribute('data-testid'),
  }))
  check(
    'Escape then Shift+Tab moves the focus out of the editor to the control before it',
    !(await inEditor()) && leftBack.tag !== 'BODY',
    JSON.stringify(leftBack),
  )
  await editor.click()
  await press('End')
  await press('Escape')
  await press('Tab')
  check(
    'Escape then Tab moves the focus out of the editor (text unchanged)',
    !(await inEditor()) &&
      (await editor.evaluate((el) => el.querySelector('p').textContent)) === 'Leave me',
  )
  await reset()
  await owner.keyboard.type('/')
  await settle()
  const menuOpened = (await owner.getByTestId('slash-menu').count()) === 1
  await press('Escape')
  check(
    'Escape in the slash menu closes only the menu; the cursor stays in the editor',
    menuOpened && (await owner.getByTestId('slash-menu').count()) === 0 && (await inEditor()),
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
    '<p style="padding-inline-start: 80px">Pasted in</p><p style="padding-inline-start: 4000px">Too far</p>',
    'Pasted in\nToo far',
  )
  await settle()
  const pasted = (await lines()).filter(([, , , x]) => x)
  check(
    'Pasted indented lines keep an indent, at most the limit',
    pasted.length === 2 &&
      pasted[0][1] > 0 &&
      pasted[1][1] <= MAX_INDENT * STEP &&
      pasted[1][1] > 0,
    JSON.stringify(pasted),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('# Lecture 4')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Intro')
  await press('Home')
  await press('Tab')
  await press('End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Detail')
  await press('Home')
  await press('Tab')
  await press('Tab')
  await press('End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('### Sub point')
  await press('Home')
  await press('Tab')
  await press('End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('> A quote')
  await press('Home')
  await press('Tab')
  await press('End')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Key')
  await press('Tab')
  await owner.keyboard.type('Value')
  await settle()
  const ownerLines = await lines()
  check(
    'Mixed indents are built as expected before saving',
    JSON.stringify(ownerLines) ===
      JSON.stringify([
        ['h1', 0, 0, 'Lecture 4'],
        ['p', STEP, 0, 'Intro'],
        ['p', 2 * STEP, 0, 'Detail'],
        ['h3', STEP, 0, 'Sub point'],
        ['blockquote', STEP, STEP, 'A quote'],
        ['p', 0, 0, 'Key\tValue'],
      ]),
    JSON.stringify(ownerLines),
  )
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Indents survive Save + reload',
    JSON.stringify(await lines()) === JSON.stringify(ownerLines),
    JSON.stringify(await lines()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  const boxes = (root) =>
    root.evaluate((el) => {
      const base = el.getBoundingClientRect()
      return [...el.children].map((n) => {
        const r = n.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(n)
        const t = range.getClientRects()[0]
        return [
          Math.round(r.x - base.x),
          Math.round(r.y - base.y),
          Math.round(r.height),
          Math.round((t?.x ?? 0) - base.x),
        ]
      })
    })
  check(
    'Visitor sees the same indents',
    JSON.stringify(await lines(view)) === JSON.stringify(ownerLines),
    JSON.stringify(await lines(view)),
  )
  check(
    'Visitor lines and their text sit in the same positions',
    JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  await shot(owner, 'owner-indent')
  await shot(visitor, 'visitor-indent')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-indent-dark')

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const res = await owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
    data: {
      title: 'Indent lecture',
      data: {
        doc: {
          root: {
            type: 'root',
            version: 1,
            children: [
              {
                type: 'paragraph',
                version: 1,
                indent: MAX_INDENT + 1,
                children: [{ type: 'text', version: 1, text: 'too deep' }],
              },
            ],
          },
        },
      },
    },
  })
  const body = await res.json()
  check(
    'Server rejects an indent above the limit',
    res.status() === 400 && /Invalid indent/.test(body.error ?? ''),
    `${res.status()} ${body.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
