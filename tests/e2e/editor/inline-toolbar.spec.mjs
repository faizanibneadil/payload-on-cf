// Task C1 (+ C2 ka pehla button): inline toolbar — kab dikhe/chhupe, jagah (oopar, jagah na ho to neeche),
// scroll ke saath, tooltip, shakal (light/dark)
import { test } from '@playwright/test'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Inline toolbar: shows on a selection, placement, hides, follows scrolling, tooltip', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, consoleErrors } = suite(browser, testInfo)
  const owner = await newPage()
  await register(owner, 'toolbar_1')
  await createBoard(owner, 'Toolbar lecture')
  const editor = owner.getByTestId('board-editor')
  const toolbar = owner.getByTestId('inline-toolbar')
  const settle = () => owner.waitForTimeout(120)
  const visible = async () => (await toolbar.count()) === 1 && (await toolbar.isVisible())
  // Toolbar aur selection ka naap (screen ke hisaab se)
  const geometry = () =>
    owner.evaluate(() => {
      const bar = document.querySelector('[data-testid="inline-toolbar"]')?.getBoundingClientRect()
      const sel = window.getSelection()?.getRangeAt(0).getBoundingClientRect()
      const header = document.querySelector('header')?.getBoundingClientRect()
      return {
        bar: bar && { top: bar.top, bottom: bar.bottom, centre: bar.left + bar.width / 2 },
        sel: sel && { top: sel.top, bottom: sel.bottom, centre: sel.left + sel.width / 2 },
        headerBottom: header?.bottom ?? 0,
        placement: document
          .querySelector('[data-testid="inline-toolbar"]')
          ?.getAttribute('data-placement'),
      }
    })

  await editor.click()
  for (let i = 1; i <= 8; i++) {
    await owner.keyboard.type(`Line number ${i} of the lecture`)
    await owner.keyboard.press('Enter')
  }
  await owner.keyboard.type('Last line here')
  await settle()
  check('No toolbar without a selection', !(await visible()))

  // ---------- Shift+Arrow selection, lower line: above ----------
  await owner.keyboard.press('Shift+Home')
  await settle()
  check('Selecting text with Shift+Home shows the toolbar', await visible())
  let g = await geometry()
  check(
    'The toolbar sits above the selection, centred on it',
    g.placement === 'top' &&
      g.bar.bottom <= g.sel.top &&
      g.sel.top - g.bar.bottom <= 12 &&
      Math.abs(g.bar.centre - g.sel.centre) <= 2,
    JSON.stringify(g),
  )
  check(
    'The toolbar has the Bold button in its format group',
    (await toolbar.getByRole('group', { name: 'Format' }).getByTestId('toolbar-bold').count()) ===
      1,
  )
  await shot(owner, 'toolbar-above')

  // ---------- Tooltip ----------
  await owner.getByTestId('toolbar-bold').hover()
  const tip = owner.locator('[data-slot="tooltip-content"]')
  await tip.waitFor({ timeout: 3000 }).catch(() => {})
  check(
    'Hovering a button shows its name and shortcut',
    /Bold/.test((await tip.textContent().catch(() => '')) ?? '') &&
      /(Ctrl\+B|⌘B)/.test((await tip.textContent().catch(() => '')) ?? ''),
    (await tip.textContent().catch(() => '')) ?? '',
  )
  await shot(owner, 'toolbar-tooltip')
  await editor.hover()

  // ---------- Hiding ----------
  await owner.keyboard.press('End')
  await settle()
  check('Collapsing the selection (End) hides the toolbar', !(await visible()))
  await owner.keyboard.press('Shift+Home')
  await settle()
  await owner.keyboard.type('Replaced')
  await settle()
  check('Typing over the selection hides the toolbar', !(await visible()))
  await owner.keyboard.press('Shift+Home')
  await settle()
  await owner.keyboard.press('Escape')
  await settle()
  check('Escape hides the toolbar', !(await visible()))
  await editor.click()
  await owner.keyboard.press('Shift+Home')
  await settle()
  await owner.mouse.click(5, 400)
  await settle()
  check('Clicking outside the editor hides the toolbar', !(await visible()))

  // ---------- Mouse selection ----------
  const last = editor.locator('p').last()
  const box = await last.boundingBox()
  await owner.mouse.move(box.x + 2, box.y + box.height / 2)
  await owner.mouse.down()
  await owner.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 5 })
  await settle()
  check('No toolbar while the mouse is still pressed', !(await visible()))
  await owner.mouse.up()
  await settle()
  check('Releasing the mouse after selecting shows the toolbar', await visible())

  // ---------- Only spaces ----------
  await editor.click()
  await owner.keyboard.press('End')
  await owner.keyboard.type('   ')
  await owner.keyboard.press('Shift+ArrowLeft')
  await owner.keyboard.press('Shift+ArrowLeft')
  await settle()
  check('Selecting only spaces shows no toolbar', !(await visible()))

  // ---------- First line: no room above -> below ----------
  await owner.keyboard.press('ControlOrMeta+Home')
  await owner.keyboard.press('Shift+End')
  await settle()
  g = await geometry()
  check(
    'On the first line (no room under the header) the toolbar goes below the selection',
    g.placement === 'bottom' && g.bar.top >= g.sel.bottom && g.bar.top > g.headerBottom,
    JSON.stringify(g),
  )
  await shot(owner, 'toolbar-below')

  // ---------- Scrolling ----------
  await owner.setViewportSize({ width: 1280, height: 420 })
  await editor.click()
  await owner.keyboard.press('ControlOrMeta+End')
  for (let i = 0; i < 12; i++) await owner.keyboard.press('Enter')
  await owner.keyboard.type('Bottom words')
  await owner.keyboard.press('Shift+Home')
  await settle()
  const before = await geometry()
  await owner.evaluate(() => {
    // Andar wala scroll container (body overflow hidden he)
    let n = document.querySelector('[data-testid="board-editor"]')
    while (n && n.scrollHeight <= n.clientHeight + 1) n = n.parentElement
    n?.scrollBy(0, -40)
  })
  await settle()
  const after = await geometry()
  check(
    'The toolbar follows the selection when the page scrolls',
    Boolean(before.bar && after.bar) &&
      Math.abs(after.bar.top - after.sel.top - (before.bar.top - before.sel.top)) <= 2 &&
      Math.abs(after.sel.top - before.sel.top - 40) <= 2,
    `${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
  )
  await owner.setViewportSize({ width: 1280, height: 800 })

  // ---------- Dark ----------
  await owner.getByTestId('theme-toggle').click()
  await editor.click()
  await owner.keyboard.press('ControlOrMeta+Home')
  await owner.keyboard.press('ArrowDown')
  await owner.keyboard.press('ArrowDown')
  await owner.keyboard.press('Shift+End')
  await settle()
  check('The toolbar shows in dark mode too', await visible())
  await shot(owner, 'toolbar-dark')

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
