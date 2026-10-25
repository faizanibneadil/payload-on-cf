// Task C4: underline — Ctrl/Cmd+U, toolbar button, bold/italic ke saath, paste, undo, Save, visitor
// read view, server (markdown me underline nahi, Payload jaisa)
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Underline: shortcut, toolbar, with bold/italic, paste, undo, save, read view, server', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'underline_1')
  const slug = await createBoard(owner, 'Underline lecture')
  const editor = owner.getByTestId('board-editor')
  const settle = () => owner.waitForTimeout(80)
  // Underline wale tukre (text) — computed style se, tag kuch bhi ho
  const underlined = (root = editor) =>
    root.evaluate((el) =>
      [...el.querySelectorAll('span, strong, em')]
        .filter(
          (n) =>
            getComputedStyle(n).textDecorationLine.includes('underline') &&
            !getComputedStyle(n.parentElement).textDecorationLine.includes('underline'),
        )
        .map((n) => n.textContent),
    )
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

  // ---------- Ctrl/Cmd+U ----------
  await reset()
  await owner.keyboard.type('Mark the key word')
  await selectBack(4)
  await press('ControlOrMeta+u')
  check(
    'Ctrl/Cmd+U underlines the selected text',
    JSON.stringify(await underlined()) === '["word"]',
    JSON.stringify(await underlined()),
  )
  await press('ControlOrMeta+u')
  check('Ctrl/Cmd+U again removes the underline', (await underlined()).length === 0)
  await press('End')
  await press('ControlOrMeta+u')
  await owner.keyboard.type(' next')
  await press('ControlOrMeta+u')
  await owner.keyboard.type(' plain')
  await settle()
  check(
    'Ctrl/Cmd+U with no selection: the next typed text is underlined, again ends it',
    JSON.stringify(await underlined()) === '[" next"]',
    JSON.stringify(await underlined()),
  )
  await press('ControlOrMeta+z')
  await owner.waitForTimeout(400)
  check('Ctrl+Z works after underlining', !(await editor.innerText()).includes(' plain'))

  // ---------- Toolbar ----------
  await reset()
  await owner.keyboard.type('Toolbar word')
  await selectBack(4)
  const button = owner.getByTestId('toolbar-underline')
  await button.waitFor()
  check(
    'The toolbar shows Bold, Italic, then Underline',
    JSON.stringify(
      await owner
        .getByTestId('inline-toolbar')
        .evaluate((el) => [...el.querySelectorAll('button')].map((b) => b.dataset.testid)),
      // Underline, Italic ke foran baad (aage ke buttons is check ko na todein)
    ).includes('"toolbar-bold","toolbar-italic","toolbar-underline"'),
  )
  await button.click()
  await settle()
  check(
    'Toolbar Underline underlines the selection and shows pressed; the selection stays',
    JSON.stringify(await underlined()) === '["word"]' &&
      (await button.getAttribute('aria-pressed')) === 'true' &&
      (await owner.evaluate(() => window.getSelection()?.toString())) === 'word',
    JSON.stringify(await underlined()),
  )
  await owner.getByTestId('toolbar-bold').click()
  await owner.getByTestId('toolbar-italic').click()
  await settle()
  const combo = await editor.evaluate((el) => {
    const n = el.querySelector('strong')
    const s = getComputedStyle(n)
    return [n.textContent, s.fontWeight, s.fontStyle, s.textDecorationLine]
  })
  check(
    'Bold, italic and underline together on one word, all three buttons pressed',
    JSON.stringify(combo) === '["word","700","italic","underline"]' &&
      (await owner
        .getByTestId('inline-toolbar')
        .evaluate((el) =>
          ['bold', 'italic', 'underline'].every(
            (k) =>
              el.querySelector(`[data-testid="toolbar-${k}"]`)?.getAttribute('aria-pressed') ===
              'true',
          ),
        )),
    JSON.stringify(combo),
  )
  await shot(owner, 'toolbar-three-formats')
  await button.click()
  await settle()
  check(
    'Toolbar Underline again removes only the underline',
    (await underlined()).length === 0 && (await editor.locator('strong').count()) === 1,
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
    '<p>One <u>u tag</u>, <span style="text-decoration:underline">docs</span> and <s>strike</s></p>',
    'One u tag, docs and strike',
  )
  await settle()
  check(
    'Pasted <u> and text-decoration underline stay underlined; strikethrough is dropped',
    JSON.stringify(await underlined()) === '["u tag","docs"]' &&
      !/<s\b|line-through/.test(await editor.innerHTML()),
    JSON.stringify(await underlined()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('## Chapter ')
  await press('ControlOrMeta+u')
  await owner.keyboard.type('two')
  await press('ControlOrMeta+u')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Remember ')
  await press('ControlOrMeta+u')
  await press('ControlOrMeta+b')
  await owner.keyboard.type('this')
  await press('ControlOrMeta+b')
  await press('ControlOrMeta+u')
  await owner.keyboard.type(' today.')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- ')
  await press('ControlOrMeta+u')
  await owner.keyboard.type('Item')
  await settle()
  const ownerLines = await underlined()
  check(
    'Underline works in headings, paragraphs (with bold) and list items',
    JSON.stringify(ownerLines) === '["two","this","Item"]',
    JSON.stringify(ownerLines),
  )
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Underline survives Save + reload',
    JSON.stringify(await underlined()) === JSON.stringify(ownerLines),
    JSON.stringify(await underlined()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  const boxes = (root) =>
    root.evaluate((el) => {
      const base = el.getBoundingClientRect()
      return [...el.querySelectorAll('span, strong, em')]
        .filter((n) => getComputedStyle(n).textDecorationLine.includes('underline'))
        .map((n) => {
          const r = n.getBoundingClientRect()
          return [
            n.tagName.toLowerCase(),
            Math.round(r.x - base.x),
            Math.round(r.y - base.y),
            Math.round(r.width),
          ]
        })
    })
  check(
    'Visitor sees the same underlined text',
    JSON.stringify(await underlined(view)) === JSON.stringify(ownerLines),
    JSON.stringify(await underlined(view)),
  )
  check(
    'Visitor underlines sit in the same places, same tags',
    JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  await shot(owner, 'owner-underline')
  await shot(visitor, 'visitor-underline')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-underline-dark')

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const saveDoc = (format) =>
    owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
      data: {
        title: 'Underline lecture',
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
  const all = await saveDoc(11)
  check('Server accepts bold + italic + underline (format 11)', all.ok(), String(all.status()))
  const strike = await saveDoc(4)
  const strikeBody = await strike.json()
  check(
    'Server rejects formats that are not built yet (strikethrough)',
    strike.status() === 400 && /Invalid text format/.test(strikeBody.error ?? ''),
    `${strike.status()} ${strikeBody.error}`,
  )

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
