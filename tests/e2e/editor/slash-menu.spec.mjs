// Task B1: slash menu (`/`) — kab khulta he, filter, keyboard/mouse se chunna, Escape, jagah, groups
import { test } from '@playwright/test'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Slash menu: opens on "/", filters, picks with keyboard or mouse, closes', async ({
  browser,
}, testInfo) => {
  const { check, newPage, shot, register, createBoard, consoleErrors } = suite(browser, testInfo)
  const owner = await newPage()
  await register(owner, 'slash_1')
  await createBoard(owner, 'Slash lecture')
  const editor = owner.getByTestId('board-editor')
  const menu = owner.getByTestId('slash-menu')
  const paragraph = owner.getByTestId('slash-item-paragraph')
  const settle = () => owner.waitForTimeout(80)
  const paragraphs = () =>
    editor.evaluate((el) => [...el.querySelectorAll(':scope > p')].map((p) => p.innerText))
  // Editor saaf kar ke naye sire se
  const reset = async () => {
    await editor.click()
    await owner.keyboard.press('ControlOrMeta+a')
    await owner.keyboard.press('Backspace')
    await settle()
  }

  // ---------- Khulna ----------
  await editor.click()
  await owner.keyboard.type('/')
  await menu.waitFor()
  check('"/" on an empty line opens the menu', await menu.isVisible())
  check('Menu shows the "Basic" group title', await menu.getByText('Basic').isVisible())
  check('"Paragraph" item with an icon', (await paragraph.locator('svg').count()) === 1)
  check(
    'First item is highlighted (Enter picks it)',
    (await paragraph.getAttribute('aria-selected')) === 'true',
  )
  // Jagah: "/" ke neeche, usi ke paas
  const slashBox = await editor.evaluate((el) => {
    const range = document.createRange()
    const text = el.querySelector('span')?.firstChild
    range.setStart(text, 0)
    range.setEnd(text, 1)
    const r = range.getBoundingClientRect()
    return { x: r.x, bottom: r.bottom }
  })
  const menuBox = await menu.boundingBox()
  check(
    'Menu opens just below the "/"',
    menuBox.y >= slashBox.bottom - 1 &&
      menuBox.y <= slashBox.bottom + 24 &&
      Math.abs(menuBox.x - slashBox.x) <= 24,
    `slash x=${Math.round(slashBox.x)} bottom=${Math.round(slashBox.bottom)}, menu ${Math.round(menuBox.x)},${Math.round(menuBox.y)}`,
  )
  await shot(owner, 'slash-menu-open')

  // ---------- Filter ----------
  await owner.keyboard.type('par')
  await settle()
  check('Typing filters by label ("/par" keeps Paragraph)', await paragraph.isVisible())
  await reset()
  await owner.keyboard.type('/text')
  await settle()
  check('Keywords match too ("/text" finds Paragraph)', await paragraph.isVisible())
  await owner.keyboard.type('zzz')
  await settle()
  check('No match closes the menu', (await menu.count()) === 0)
  await owner.keyboard.press('Backspace')
  await owner.keyboard.press('Backspace')
  await owner.keyboard.press('Backspace')
  await settle()
  check('Deleting back to a match opens it again', await menu.isVisible())
  await owner.keyboard.type(' ')
  await settle()
  check('A space closes the menu', (await menu.count()) === 0)

  // ---------- Keyboard se chunna ----------
  await reset()
  await owner.keyboard.type('Intro ')
  await owner.keyboard.type('/par')
  await menu.waitFor()
  await owner.keyboard.press('Enter')
  await settle()
  check(
    'Enter picks the item and removes "/par" (no new line)',
    JSON.stringify(await paragraphs()) === JSON.stringify(['Intro ']),
    JSON.stringify(await paragraphs()),
  )
  check('Menu is closed after picking', (await menu.count()) === 0)
  await owner.keyboard.type('continues')
  check(
    'Typing goes on where the "/" was',
    (await paragraphs())[0] === 'Intro continues',
    JSON.stringify(await paragraphs()),
  )

  // ---------- Mouse se chunna ----------
  await owner.keyboard.press('Enter')
  await owner.keyboard.type('/')
  await menu.waitFor()
  await paragraph.hover()
  check('Hover highlights the item', (await paragraph.getAttribute('aria-selected')) === 'true')
  await paragraph.click()
  await settle()
  check(
    'Click picks the item and removes "/"',
    // Khali paragraph ka innerText "\n" hota he (andar <br>)
    JSON.stringify((await paragraphs()).map((t) => t.trim())) ===
      JSON.stringify(['Intro continues', '']),
    JSON.stringify(await paragraphs()),
  )
  check(
    'Editor keeps focus after a click in the menu',
    await editor.evaluate((el) => el === document.activeElement),
  )

  // ---------- Escape ----------
  await owner.keyboard.type('/pa')
  await menu.waitFor()
  await owner.keyboard.press('Escape')
  await settle()
  check('Escape closes the menu', (await menu.count()) === 0)
  check('Escape keeps the typed "/pa"', (await paragraphs())[1] === '/pa')

  // ---------- Kab nahi khulta / kab khulta ----------
  await reset()
  await owner.keyboard.type('and/or')
  await settle()
  check('"/" inside a word does not open the menu', (await menu.count()) === 0)
  await reset()
  await owner.keyboard.type('see (/')
  await settle()
  check('"/" after "(" opens the menu (like Payload)', await menu.isVisible())
  await owner.keyboard.press('Escape')

  // Dark theme
  await reset()
  await owner.getByTestId('theme-toggle').click()
  await editor.click()
  await owner.keyboard.type('/')
  await menu.waitFor()
  await shot(owner, 'slash-menu-dark')
  await owner.keyboard.press('Escape')

  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
