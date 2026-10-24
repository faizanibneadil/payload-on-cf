// Task B5 fix: list me Tab = andar wali (nested) list, Shift+Tab = bahar — numbered aur bullet dono,
// kai items ek saath, hadd, paragraph me Tab pehle jaisa, undo, Save, visitor read view
import { test } from '@playwright/test'
import { BASE } from '../base.mjs'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('List nesting: Tab / Shift+Tab in numbered and bullet lists, limit, save, read view', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, share, save, consoleErrors } = suite(
    browser,
    testInfo,
  )
  const owner = await newPage()
  await register(owner, 'nest_1')
  const slug = await createBoard(owner, 'Nested lecture')
  const editor = owner.getByTestId('board-editor')
  const settle = () => owner.waitForTimeout(80)
  // Har item (wrapper ke baghair): [list ki gehrai, list tag, marker style, number, text]
  const items = (root = editor) =>
    root.evaluate((el) =>
      [...el.querySelectorAll('li')]
        .filter((li) => !(li.firstElementChild?.matches('ol, ul') ?? false))
        .map((li) => {
          let depth = 0
          for (let n = li.parentElement; n && n !== el; n = n.parentElement) {
            if (n.matches('ol, ul')) depth++
          }
          const list = li.parentElement
          return [
            depth,
            list.tagName.toLowerCase(),
            getComputedStyle(list).listStyleType,
            li.value,
            li.innerText.replace(/\n$/, ''),
          ]
        }),
    )
  const same = async (expected, root = editor) =>
    JSON.stringify(await items(root)) === JSON.stringify(expected)
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

  // ---------- Numbered list ----------
  await reset()
  await owner.keyboard.type('1. Fruits')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Apple')
  await settle()
  await press('Tab')
  check(
    'Tab on the second item makes it a nested list under the first (A.)',
    await same([
      [1, 'ol', 'decimal', 1, 'Fruits'],
      [2, 'ol', 'upper-alpha', 1, 'Apple'],
    ]),
    JSON.stringify(await items()),
  )
  check(
    'The cursor stays in the editor after Tab (focus does not move away)',
    await editor.evaluate(
      (el) => el.contains(document.activeElement) || el === document.activeElement,
    ),
  )
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Mango')
  await settle()
  check(
    'Enter in a nested item makes the next nested item (B.)',
    await same([
      [1, 'ol', 'decimal', 1, 'Fruits'],
      [2, 'ol', 'upper-alpha', 1, 'Apple'],
      [2, 'ol', 'upper-alpha', 2, 'Mango'],
    ]),
    JSON.stringify(await items()),
  )
  await press('Tab')
  check(
    'Tab again goes one more level in (a.)',
    (await items()).at(-1).join() === [3, 'ol', 'lower-alpha', 1, 'Mango'].join(),
    JSON.stringify(await items()),
  )
  await shot(owner, 'numbered-nested')
  await press('Shift+Tab')
  await press('Shift+Tab')
  check(
    'Shift+Tab twice brings it back to the top level (2.)',
    (await items()).at(-1).join() === [1, 'ol', 'decimal', 2, 'Mango'].join(),
    JSON.stringify(await items()),
  )
  await press('Tab')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Vegetables')
  await settle()
  check(
    'Enter on an empty nested item moves it one level out',
    (await items()).at(-1).join() === [1, 'ol', 'decimal', 2, 'Vegetables'].join(),
    JSON.stringify(await items()),
  )
  await press('ControlOrMeta+z')
  await press('ControlOrMeta+z')
  check('Ctrl+Z undoes nesting steps', (await items()).length >= 2, JSON.stringify(await items()))

  // ---------- Bullet list ----------
  await reset()
  await owner.keyboard.type('- Tools')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Hammer')
  await owner.keyboard.press('Tab')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Saw')
  await settle()
  const bullets = await items()
  check(
    'Tab nests bullet items too',
    JSON.stringify(bullets.map(([d, t, , , x]) => [d, t, x])) ===
      JSON.stringify([
        [1, 'ul', 'Tools'],
        [2, 'ul', 'Hammer'],
        [2, 'ul', 'Saw'],
      ]),
    JSON.stringify(bullets),
  )
  await shot(owner, 'bullet-nested')

  // ---------- Several items at once ----------
  await reset()
  await owner.keyboard.type('1. One')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Two')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Three')
  await settle()
  await press('Shift+ArrowUp')
  await press('Tab')
  check(
    'Tab with two items selected nests both',
    JSON.stringify((await items()).map(([d, , , n, x]) => [d, n, x])) ===
      JSON.stringify([
        [1, 1, 'One'],
        [2, 1, 'Two'],
        [2, 2, 'Three'],
      ]),
    JSON.stringify(await items()),
  )
  await press('Shift+Tab')
  check(
    'Shift+Tab with two items selected brings both out',
    JSON.stringify((await items()).map(([d, , , n]) => [d, n])) ===
      JSON.stringify([
        [1, 1],
        [1, 2],
        [1, 3],
      ]),
    JSON.stringify(await items()),
  )

  // ---------- Outside lists: unchanged until indent (B8) ----------
  await reset()
  await owner.keyboard.type('Plain paragraph')
  await press('Home')
  await press('Tab')
  const para = await editor.evaluate((el) => {
    const p = el.querySelector('p')
    return { indent: p.style.paddingInlineStart || p.style.textIndent || '', text: p.innerText }
  })
  check(
    'Tab in a paragraph does not indent it (indent comes in B8)',
    para.indent === '' && para.text === 'Plain paragraph',
    JSON.stringify(para),
  )

  // ---------- Limit ----------
  await reset()
  await owner.keyboard.type('1. Top')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Deep')
  for (let i = 0; i < 20; i++) await owner.keyboard.press('Tab')
  await settle()
  const deepest = (await items()).at(-1)
  check(
    'Tab stops at 15 levels (the deepest the server saves); extra Tabs do nothing',
    deepest[0] === 15 && deepest[4] === 'Deep',
    JSON.stringify(deepest),
  )
  // save() tabhi lautta he jab "Unsaved changes" hat jaye (server ne qubool kiya)
  const saved = await save(owner).then(
    () => true,
    (e) => String(e),
  )
  check('A list nested to the limit saves without an error', saved === true, String(saved))

  // ---------- Save, reload, visitor ----------
  await reset()
  await owner.keyboard.type('## Course plan')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('1. Basics')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Variables')
  await owner.keyboard.press('Tab')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Types')
  await owner.keyboard.press('Tab')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Numbers')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Functions')
  await owner.keyboard.press('Enter')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('- Notes')
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('Bring a laptop')
  await owner.keyboard.press('Tab')
  await settle()
  const ownerItems = await items()
  check(
    'Mixed nesting is built as expected before saving',
    JSON.stringify(ownerItems.map(([d, t, s, n, x]) => [d, t, s, n, x])) ===
      JSON.stringify([
        [1, 'ol', 'decimal', 1, 'Basics'],
        [2, 'ol', 'upper-alpha', 1, 'Variables'],
        [3, 'ol', 'lower-alpha', 1, 'Types'],
        [3, 'ol', 'lower-alpha', 2, 'Numbers'],
        [1, 'ol', 'decimal', 2, 'Functions'],
        [1, 'ul', 'disc', 1, 'Notes'],
        [2, 'ul', 'disc', 1, 'Bring a laptop'],
      ]),
    JSON.stringify(ownerItems),
  )
  await save(owner)
  await owner.reload({ waitUntil: 'networkidle' })
  await editor.waitFor()
  check(
    'Nested lists survive Save + reload',
    JSON.stringify(await items()) === JSON.stringify(ownerItems),
    JSON.stringify(await items()),
  )
  await share(owner)
  const visitor = await newPage()
  await visitor.goto(`${BASE}/b/${slug}`, { waitUntil: 'networkidle' })
  const view = visitor.getByTestId('document-view')
  const boxes = (root) =>
    root.evaluate((el) =>
      [...el.querySelectorAll('li')].map((li) => {
        const r = li.getBoundingClientRect()
        return [li.value, Math.round(r.x), Math.round(r.y), Math.round(r.height)]
      }),
    )
  check(
    'Visitor sees the same nesting, numbers and styles',
    JSON.stringify(await items(view)) === JSON.stringify(ownerItems),
    JSON.stringify(await items(view)),
  )
  check(
    'Visitor lists sit in the same positions',
    JSON.stringify(await boxes(view)) === JSON.stringify(await boxes(editor)),
    `${JSON.stringify(await boxes(view))} vs ${JSON.stringify(await boxes(editor))}`,
  )
  await shot(owner, 'owner-nested')
  await shot(visitor, 'visitor-nested')
  await owner.getByTestId('theme-toggle').click()
  await shot(owner, 'owner-nested-dark')

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
