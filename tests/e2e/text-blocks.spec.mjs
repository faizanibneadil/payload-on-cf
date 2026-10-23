// Iteration 4, step 2: text blocks on Lexical — click anywhere and type, auto width, inline toolbar,
// slash menu, to-do list, saving while editing, read view for visitors
import { test } from '@playwright/test'
import { BASE } from './base.mjs'
import { recordVideos } from './contexts.mjs'
import { lineTypes, suite } from './helpers.mjs'
import { freshServerPerFile } from './server.mjs'

freshServerPerFile()
recordVideos()

test('Text blocks (Lexical): type anywhere, auto width, toolbar, slash menu, to-do', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'writer_1')
  const slug = await createBoard(owner, 'Lexical lecture')
  const surface = owner.getByTestId('canvas-surface')
  const editor = owner.getByTestId('text-editor')
  const blocks = owner.getByTestId('text-block')
  // Selection badalne ke baad browser/Lexical ko sync hone ka waqt (insaan itni tezi se nahi dabata)
  const settle = () => owner.waitForTimeout(80)
  const box = async (loc) => {
    const b = await loc.boundingBox()
    return {
      x: Math.round(b.x),
      y: Math.round(b.y),
      w: Math.round(b.width),
      h: Math.round(b.height),
    }
  }

  // ---------- Click anywhere and type ----------
  check(
    'Empty board explains click-and-type',
    await owner.getByText('Click anywhere and start typing').isVisible(),
  )
  await surface.click({ position: { x: 300, y: 200 } })
  check(
    'Click on empty canvas shows a typing caret',
    await owner.getByTestId('type-caret').isVisible(),
  )
  await shot(owner, 'click-to-type-caret')
  await owner.keyboard.type('Hello world')
  await editor.waitFor()
  check('Typing after the click creates a block', (await blocks.count()) === 1)
  check(
    'The typed text is all in the block (first key not lost)',
    (await editor.innerText()).trim() === 'Hello world',
    JSON.stringify(await editor.innerText()),
  )
  check(
    'Caret is gone once the block exists',
    (await owner.getByTestId('type-caret').count()) === 0,
  )
  const caretBox = await box(blocks.first())
  check(
    'Block starts where the click was',
    Math.abs(caretBox.x + 12 - 300) <= 3,
    JSON.stringify(caretBox),
  )

  // ---------- Auto width ----------
  const w0 = (await box(blocks.first())).w
  const h0 = (await box(blocks.first())).h
  await owner.keyboard.type(' — a much longer line that keeps going to the right')
  const grown = await box(blocks.first())
  check(
    'Block grows wider while typing (no fixed width)',
    grown.w > w0 + 150,
    `${w0} -> ${grown.w}`,
  )
  check('Long line stays on one line (no wrap)', grown.h === h0, `${h0} -> ${grown.h}`)
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Second line')
  check('Enter starts a new line', (await box(blocks.first())).h > h0 + 10)

  // ---------- Inline toolbar ----------
  // "Second" chuno (line ke beech ka lafz, taake aage likha text bold na ho)
  await owner.keyboard.press('Home')
  await settle()
  for (let i = 0; i < 6; i++) await owner.keyboard.press('Shift+ArrowRight')
  await settle()
  const toolbar = owner.getByTestId('inline-toolbar')
  await toolbar.waitFor()
  check('Selecting text shows the inline toolbar', await toolbar.isVisible())
  check(
    'Toolbar has bold, italic, strikethrough and code',
    (await toolbar.getByRole('button').count()) === 4,
  )
  await shot(owner, 'inline-toolbar')
  await owner.getByTestId('format-bold').click()
  await settle()
  check(
    'Bold button makes the selection bold',
    (await editor.locator('.md-bold').innerText()) === 'Second',
  )
  check(
    'Bold button shows as active',
    (await owner.getByTestId('format-bold').getAttribute('aria-pressed')) === 'true',
  )
  await owner.getByTestId('format-italic').click()
  await settle()
  check('Italic button works', (await editor.locator('.md-italic').count()) > 0)
  await owner.keyboard.press('End')
  await settle()
  check('Toolbar hides when nothing is selected', (await toolbar.count()) === 0)
  // Underline markdown me save nahi hota: band
  await owner.keyboard.press('Shift+Home')
  await settle()
  await owner.keyboard.press('Control+u')
  check(
    'Ctrl+U does not underline (cannot be saved in markdown)',
    (await editor.locator('u, .underline').count()) === 0,
  )
  await owner.keyboard.press('End')

  // ---------- Slash menu ----------
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('/')
  const menu = owner.getByTestId('slash-menu')
  await menu.waitFor()
  check('"/" opens the block menu', await menu.isVisible())
  check(
    'Menu offers text, 3 headings, 2 lists and a to-do list',
    (await menu.getByRole('option').count()) === 7,
    String(await menu.getByRole('option').count()),
  )
  await shot(owner, 'slash-menu')
  await owner.keyboard.type('head')
  check('Typing filters the menu', (await menu.getByRole('option').count()) === 3)
  await owner.keyboard.press('Escape')
  check(
    'Escape closes only the menu (still editing)',
    (await menu.count()) === 0 && (await editor.count()) === 1,
  )
  // "/head" text hata kar dobara
  for (let i = 0; i < 5; i++) await owner.keyboard.press('Backspace')
  await owner.keyboard.type('/')
  await menu.waitFor()
  await owner.getByTestId('slash-heading-2').click()
  await owner.keyboard.type('Section title')
  let types = await lineTypes(editor)
  check(
    'Choosing "Heading 2" turns the line into a heading (and removes the "/")',
    types.at(-1) === 'h2' && !(await editor.innerText()).includes('/'),
    JSON.stringify(types),
  )

  // ---------- To-do list ----------
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('/todo')
  // Menu taaza query par update hone ka mauqa (insaan aakhri harf aur Enter ke beech itna ruk jata hai)
  await owner.waitForTimeout(100)
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Prepare slides')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Share the link')
  types = await lineTypes(editor)
  check(
    '"/todo" starts a to-do list',
    JSON.stringify(types.slice(-2)) === '["todo","todo"]',
    JSON.stringify(types),
  )
  const firstTodo = editor.locator('.md-checklist > li').first()
  check(
    'The "/todo" text is removed from the line',
    (await firstTodo.innerText()).trim() === 'Prepare slides',
    JSON.stringify(await firstTodo.innerText()),
  )
  const tb = await firstTodo.boundingBox()
  await owner.mouse.click(tb.x + 8, tb.y + tb.height / 2)
  check(
    'Clicking the box ticks the item',
    (await firstTodo.getAttribute('aria-checked')) === 'true',
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- ')
  await owner.keyboard.type('[ ] ')
  await owner.keyboard.type('typed to-do')
  types = await lineTypes(editor)
  check('Markdown "- [ ] " also makes a to-do item', types.at(-1) === 'todo', JSON.stringify(types))
  await shot(owner, 'editing-rich-text')

  // ---------- Saving while still editing ----------
  await owner.waitForTimeout(500)
  check(
    'Typing marks the board unsaved while still editing',
    await owner.getByTestId('unsaved-indicator').isVisible(),
  )
  await owner.keyboard.press('Control+s')
  await owner.getByTestId('unsaved-indicator').waitFor({ state: 'detached' })
  check('Ctrl+S inside the editor saves', (await editor.count()) === 1)
  await owner.keyboard.press('Escape')
  await editor.waitFor({ state: 'detached' })
  const block = blocks.first()
  check('Escape leaves edit mode', (await editor.count()) === 0)
  check(
    'Read view keeps bold, italic, heading and to-do state',
    (await block.locator('.md-bold').count()) > 0 &&
      (await block.locator('.md-italic').count()) > 0 &&
      (await block.locator('.md-h2').count()) === 1 &&
      (await block.locator('[aria-checked="true"]').count()) === 1,
  )
  check(
    'Leaving edit mode after Ctrl+S needs no new save',
    (await owner.getByTestId('unsaved-indicator').count()) === 0,
  )
  await owner.reload({ waitUntil: 'networkidle' })
  await blocks.first().waitFor()
  const reloaded = blocks.first()
  check(
    'Everything survives reload',
    (await reloaded.innerText()).includes('Prepare slides') &&
      (await reloaded.locator('.md-bold').innerText()) === 'Second' &&
      (await reloaded.locator('[aria-checked="true"]').count()) === 1,
  )
  await shot(owner, 'read-view')

  // ---------- Width after a side drag ----------
  const r0 = await box(reloaded)
  await owner.mouse.move(r0.x + r0.w, r0.y + r0.h / 2)
  await owner.mouse.down()
  await owner.mouse.move(r0.x + r0.w - 200, r0.y + r0.h / 2, { steps: 6 })
  await owner.mouse.up()
  const r1 = await box(reloaded)
  check(
    'Dragging the side border fixes the width and the text wraps',
    Math.abs(r1.w - (r0.w - 200)) <= 2 && r1.h > r0.h,
    `${JSON.stringify(r0)} -> ${JSON.stringify(r1)}`,
  )
  await reloaded.dblclick({ position: { x: 20, y: 12 } })
  await editor.waitFor()
  await owner.keyboard.press('Control+End')
  await owner.keyboard.type(' more words to see that the fixed width keeps wrapping')
  check(
    'A fixed-width block keeps its width while typing',
    Math.abs((await box(reloaded)).w - r1.w) <= 2,
  )
  await owner.keyboard.press('Escape')
  await save(owner)

  // ---------- Visitor ----------
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const vBlock = visitor.getByTestId('text-block').first()
  await vBlock.waitFor()
  check(
    'Visitor sees the formatted text and the ticked to-do',
    (await vBlock.locator('.md-bold').count()) > 0 &&
      (await vBlock.locator('[aria-checked="true"]').count()) === 1,
  )
  const vTodo = vBlock.locator('.md-checklist > li').nth(1)
  const vb = await vTodo.boundingBox()
  await visitor.mouse.click(vb.x + 8, vb.y + vb.height / 2)
  check('Visitor cannot tick a to-do item', (await vTodo.getAttribute('aria-checked')) === 'false')
  await visitor.getByTestId('canvas-surface').click({ position: { x: 900, y: 600 } })
  await visitor.keyboard.type('abc')
  check(
    'Visitor typing on the canvas creates nothing',
    (await visitor.getByTestId('text-block').count()) === 1 &&
      (await visitor.getByTestId('type-caret').count()) === 0,
  )
  await shot(visitor, 'visitor-read-view')
  await visitor.getByTestId('theme-toggle').click()
  await shot(visitor, 'visitor-read-view-dark')

  const unexpected = consoleErrors.filter((e) => !e.includes('status of 404'))
  check('No unexpected browser console errors', unexpected.length === 0, unexpected.join(' | '))
})
