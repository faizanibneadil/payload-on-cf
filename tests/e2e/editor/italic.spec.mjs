// Task C3: italic — Ctrl/Cmd+I, toolbar button, `*text*` / `_text_`, bold-italic `***` / `___`, quote ke
// andar seedha, paste, undo, Save, visitor read view, server
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Italic: shortcut, toolbar, markdown, bold-italic, quote, paste, save, read view, server', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'italic_1')
  const slug = await createBoard(owner, 'Italic lecture')
  const editor = owner.getByTestId('board-editor')
  const settle = () => owner.waitForTimeout(80)
  // Har formatted tukra: [tag, italic dikhta he?, bold weight, text]
  const pieces = (root = editor) =>
    root.evaluate((el) =>
      [...el.querySelectorAll('em, strong')].map((n) => {
        const s = getComputedStyle(n)
        return [n.tagName.toLowerCase(), s.fontStyle, Number(s.fontWeight), n.textContent]
      }),
    )
  const italics = async (root = editor) =>
    (await pieces(root)).filter(([, style]) => style === 'italic').map(([, , , t]) => t)
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

  // ---------- Ctrl/Cmd+I ----------
  await reset()
  await owner.keyboard.type('Say it softly')
  await selectBack(6)
  await press('ControlOrMeta+i')
  check(
    'Ctrl/Cmd+I makes the selected text italic (<em>)',
    JSON.stringify(await pieces()) === '[["em","italic",400,"softly"]]',
    JSON.stringify(await pieces()),
  )
  await press('ControlOrMeta+i')
  check('Ctrl/Cmd+I again removes italic', (await pieces()).length === 0)
  await press('End')
  await press('ControlOrMeta+i')
  await owner.keyboard.type(' now')
  await press('ControlOrMeta+i')
  await owner.keyboard.type(' plain')
  await settle()
  check(
    'Ctrl/Cmd+I with no selection: the next typed text is italic, again ends it',
    JSON.stringify(await italics()) === '[" now"]',
    JSON.stringify(await italics()),
  )

  // ---------- Toolbar ----------
  await reset()
  await owner.keyboard.type('Toolbar word')
  await selectBack(4)
  const button = owner.getByTestId('toolbar-italic')
  await button.waitFor()
  check(
    'The toolbar shows Bold, then Italic',
    JSON.stringify(
      await owner
        .getByTestId('inline-toolbar')
        .evaluate((el) => [...el.querySelectorAll('button')].map((b) => b.dataset.testid)),
    ) === '["toolbar-bold","toolbar-italic"]',
  )
  await button.click()
  await settle()
  check(
    'Toolbar Italic makes the selection italic and shows pressed; the selection stays',
    JSON.stringify(await italics()) === '["word"]' &&
      (await button.getAttribute('aria-pressed')) === 'true' &&
      (await owner.evaluate(() => window.getSelection()?.toString())) === 'word',
    JSON.stringify(await italics()),
  )
  await owner.getByTestId('toolbar-bold').click()
  await settle()
  check(
    'Bold and italic together: one <strong> that is bold and italic, both buttons pressed',
    JSON.stringify(await pieces()) === '[["strong","italic",700,"word"]]' &&
      (await owner.getByTestId('toolbar-bold').getAttribute('aria-pressed')) === 'true' &&
      (await button.getAttribute('aria-pressed')) === 'true',
    JSON.stringify(await pieces()),
  )
  await shot(owner, 'toolbar-bold-italic')
  await button.click()
  await settle()
  check(
    'Toolbar Italic again removes only italic (bold stays)',
    JSON.stringify(await pieces()) === '[["strong","normal",700,"word"]]',
    JSON.stringify(await pieces()),
  )

  // ---------- Markdown ----------
  await reset()
  await owner.keyboard.type('Use *stars* and _lines_ here')
  await settle()
  check(
    '"*text*" and "_text_" become italic while typing (Payload)',
    JSON.stringify(await italics()) === '["stars","lines"]' &&
      (await editor.innerText()).trim() === 'Use stars and lines here',
    `${JSON.stringify(await italics())} ${await editor.innerText()}`,
  )
  await reset()
  await owner.keyboard.type('Both ***stars*** and ___lines___ and **bold** end')
  await settle()
  check(
    '"***text***" and "___text___" become bold and italic; "**text**" stays bold only',
    JSON.stringify(await pieces()) ===
      JSON.stringify([
        ['strong', 'italic', 700, 'stars'],
        ['strong', 'italic', 700, 'lines'],
        ['strong', 'normal', 700, 'bold'],
      ]) && (await editor.innerText()).trim() === 'Both stars and lines and bold end',
    `${JSON.stringify(await pieces())} ${await editor.innerText()}`,
  )
  await reset()
  await owner.keyboard.type('snake_case_name stays')
  await settle()
  check(
    'Underscores inside a word do not make italic (snake_case)',
    (await pieces()).length === 0 && (await editor.innerText()).trim() === 'snake_case_name stays',
    await editor.innerText(),
  )
  await reset()
  await owner.keyboard.type('Undo _this_')
  await owner.waitForTimeout(1200)
  await press('ControlOrMeta+z')
  check(
    'Ctrl+Z right after a markdown italic brings the marks back',
    (await editor.innerText()).includes('_this_') && (await pieces()).length === 0,
    await editor.innerText(),
  )

  // ---------- Quote ----------
  await reset()
  await owner.keyboard.type('> Learn by doing')
  await selectBack(5)
  await press('ControlOrMeta+i')
  const quote = await editor.evaluate((el) => ({
    quote: getComputedStyle(el.querySelector('blockquote')).fontStyle,
    word: getComputedStyle(el.querySelector('blockquote em')).fontStyle,
  }))
  check(
    'Inside a quote (italic) an italic word shows upright (owner)',
    quote.quote === 'italic' && quote.word === 'normal',
    JSON.stringify(quote),
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
    '<p>One <i>i tag</i>, <em>em tag</em>, <span style="font-style:italic">docs</span> and <u>under</u></p>',
    'One i tag, em tag, docs and under',
  )
  await settle()
  check(
    'Pasted <i>, <em> and font-style italic stay italic; underline is dropped (not built yet)',
    JSON.stringify(await italics()) === '["i tag","em tag","docs"]' &&
      (await editor.locator('u').count()) === 0,
    JSON.stringify(await italics()),
  )

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('## A *gentle* start')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Read ***this*** first.')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- An _item_')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('> Quote with *upright* word')
  await settle()
  const ownerPieces = await pieces()
  check(
    'Italic works in headings, paragraphs, list items and quotes',
    JSON.stringify(ownerPieces.map(([t, , , x]) => [t, x])) ===
      JSON.stringify([
        ['em', 'gentle'],
        ['strong', 'this'],
        ['em', 'item'],
        ['em', 'upright'],
      ]),
    JSON.stringify(ownerPieces),
  )
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Italic survives Save + reload',
    JSON.stringify(await pieces()) === JSON.stringify(ownerPieces),
    JSON.stringify(await pieces()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  const boxes = (root) =>
    root.evaluate((el) => {
      const base = el.getBoundingClientRect()
      return [...el.querySelectorAll('em, strong')].map((s) => {
        const r = s.getBoundingClientRect()
        return [Math.round(r.x - base.x), Math.round(r.y - base.y), Math.round(r.width)]
      })
    })
  check(
    'Visitor sees the same italic and bold-italic text with the same look',
    JSON.stringify(await pieces(view)) === JSON.stringify(ownerPieces),
    JSON.stringify(await pieces(view)),
  )
  check(
    'Visitor text sits in the same places',
    JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  await shot(owner, 'owner-italic')
  await shot(visitor, 'visitor-italic')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-italic-dark')

  // ---------- Server ----------
  const board = await (
    await owner.request.get(`${BASE}/api/boards?where[slug][equals]=${slug}&depth=0`)
  ).json()
  const saveDoc = (format) =>
    owner.request.post(`${BASE}/api/boards/${board.docs[0].id}/save`, {
      data: {
        title: 'Italic lecture',
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
  const both = await saveDoc(3)
  check('Server accepts bold + italic (format 3)', both.ok(), String(both.status()))
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
