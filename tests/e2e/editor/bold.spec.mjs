// Task C2: bold — Ctrl/Cmd+B, toolbar button, `**text**` / `__text__`, paste, undo, headings, Save,
// visitor read view, server
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Bold: shortcut, toolbar, markdown, paste, undo, headings, save, read view, server', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'bold_1')
  const slug = await createBoard(owner, 'Bold lecture')
  const editor = owner.getByTestId('board-editor')
  const settle = () => owner.waitForTimeout(80)
  // Har line ke bold tukre (text) aur poora text
  const bolds = (root = editor) =>
    root.evaluate((el) => [...el.querySelectorAll('strong')].map((s) => s.textContent))
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
  const selectBack = async (n) => {
    for (let i = 0; i < n; i++) await owner.keyboard.press('Shift+ArrowLeft')
    await settle()
  }

  // ---------- Ctrl/Cmd+B ----------
  await reset()
  await owner.keyboard.type('Make this strong')
  await selectBack(6)
  await press('ControlOrMeta+b')
  check(
    'Ctrl/Cmd+B makes the selected text bold',
    JSON.stringify(await bolds()) === '["strong"]',
    JSON.stringify(await bolds()),
  )
  const weight = await editor.evaluate((el) => ({
    bold: getComputedStyle(el.querySelector('strong')).fontWeight,
    normal: getComputedStyle(el.querySelector('p')).fontWeight,
  }))
  check(
    'Bold text is heavier (700) than normal text (400)',
    weight.bold === '700' && weight.normal === '400',
    JSON.stringify(weight),
  )
  await press('ControlOrMeta+b')
  check('Ctrl/Cmd+B again removes bold', (await bolds()).length === 0)
  await press('End')
  await press('ControlOrMeta+b')
  await owner.keyboard.type(' now')
  await press('ControlOrMeta+b')
  await owner.keyboard.type(' plain')
  await settle()
  check(
    'Ctrl/Cmd+B with no selection: the next typed text is bold, again Ctrl/Cmd+B ends it',
    JSON.stringify(await bolds()) === '[" now"]' &&
      (await editor.innerText()).trim() === 'Make this strong now plain',
    JSON.stringify(await bolds()),
  )

  // ---------- Toolbar ----------
  await reset()
  await owner.keyboard.type('Toolbar word')
  await selectBack(4)
  const button = owner.getByTestId('toolbar-bold')
  await button.waitFor()
  check(
    'Toolbar Bold button shows unpressed',
    (await button.getAttribute('aria-pressed')) === 'false',
  )
  await button.click()
  await settle()
  check(
    'Toolbar Bold makes the selection bold and shows pressed; the selection stays',
    JSON.stringify(await bolds()) === '["word"]' &&
      (await button.getAttribute('aria-pressed')) === 'true' &&
      (await owner.evaluate(() => window.getSelection()?.toString())) === 'word',
    JSON.stringify(await bolds()),
  )
  await shot(owner, 'toolbar-bold-pressed')
  await button.click()
  await settle()
  check(
    'Toolbar Bold again removes bold',
    (await bolds()).length === 0 && (await button.getAttribute('aria-pressed')) === 'false',
  )

  // ---------- Markdown ----------
  await reset()
  await owner.keyboard.type('Use **stars** and __lines__ here')
  await settle()
  check(
    '"**text**" and "__text__" become bold while typing (Payload)',
    JSON.stringify(await bolds()) === '["stars","lines"]' &&
      (await editor.innerText()).trim() === 'Use stars and lines here',
    `${JSON.stringify(await bolds())} ${await editor.innerText()}`,
  )
  await reset()
  await owner.keyboard.type('Undo __this__')
  // History typing ko jod deti he; thora ruk kar, taa ke Ctrl+Z sirf aakhri qadam (bold) wapas le
  await owner.waitForTimeout(1200)
  await press('ControlOrMeta+z')
  check(
    'Ctrl+Z right after a markdown bold brings the marks back',
    (await editor.innerText()).includes('__this__') && (await bolds()).length === 0,
    await editor.innerText(),
  )

  // ---------- Headings ----------
  await reset()
  await owner.keyboard.type('# Big title')
  await selectBack(5)
  await press('ControlOrMeta+b')
  const heading = await editor.evaluate((el) => ({
    bold: getComputedStyle(el.querySelector('h1 strong')).fontWeight,
    heading: getComputedStyle(el.querySelector('h1')).fontWeight,
  }))
  check(
    'Bold inside a heading is still heavier than the heading',
    Number(heading.bold) > Number(heading.heading),
    JSON.stringify(heading),
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
    '<p>One <b>b tag</b>, <strong>strong tag</strong>, <span style="font-weight:700">docs</span> and <i>italic</i></p>',
    'One b tag, strong tag, docs and italic',
  )
  await settle()
  check(
    'Pasted <b>, <strong> and font-weight bold stay bold; italic is dropped (not built yet)',
    JSON.stringify(await bolds()) === '["b tag","strong tag","docs"]' &&
      (await editor.locator('em, i').count()) === 0,
    JSON.stringify(await bolds()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('## Key terms')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('A **variable** stores a value.')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- **Loop**: repeats')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('> Read **carefully**')
  await settle()
  const ownerBolds = await bolds()
  check(
    'Bold works in paragraphs, list items and quotes',
    JSON.stringify(ownerBolds) === '["variable","Loop","carefully"]',
    JSON.stringify(ownerBolds),
  )
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Bold survives Save + reload',
    JSON.stringify(await bolds()) === JSON.stringify(ownerBolds),
    JSON.stringify(await bolds()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  const boxes = (root) =>
    root.evaluate((el) => {
      const base = el.getBoundingClientRect()
      return [...el.querySelectorAll('strong')].map((s) => {
        const r = s.getBoundingClientRect()
        return [
          Math.round(r.x - base.x),
          Math.round(r.y - base.y),
          Math.round(r.width),
          getComputedStyle(s).fontWeight,
        ]
      })
    })
  check(
    'Visitor sees the same bold text',
    JSON.stringify(await bolds(view)) === JSON.stringify(ownerBolds),
    JSON.stringify(await bolds(view)),
  )
  check(
    'Visitor bold sits in the same place with the same weight',
    JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  check('Visitor gets no toolbar', (await visitor.getByTestId('inline-toolbar').count()) === 0)
  await shot(owner, 'owner-bold')
  await shot(visitor, 'visitor-bold')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-bold-dark')

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const saveDoc = (format) =>
    owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
      data: {
        title: 'Bold lecture',
        data: {
          doc: {
            root: {
              type: 'root',
              version: 1,
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  children: [{ type: 'text', version: 1, text: 'x', format }],
                },
              ],
            },
          },
        },
      },
    })
  const italic = await saveDoc(2)
  const italicBody = await italic.json()
  check(
    'Server rejects formats that are not built yet (italic)',
    italic.status() === 400 && /Invalid text format/.test(italicBody.error ?? ''),
    `${italic.status()} ${italicBody.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
