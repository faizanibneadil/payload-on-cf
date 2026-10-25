// Task C1: inline toolbar ka shell — abhi koi button nahi (Bold C2 me), is liye selection par toolbar nahi
// dikhta aur editor pehle jaisa chalta he. C2 se yahan toolbar ke asal checks (jagah, chhupna, buttons).
import { test } from '@playwright/test'
import { recordVideos } from '../contexts.mjs'
import { suite } from '../helpers.mjs'
import { freshServerPerFile } from '../server.mjs'

freshServerPerFile()
recordVideos()

test('Inline toolbar shell: no buttons yet, so nothing shows; the editor works as before', async ({
  browser,
}, testInfo) => {
  const { check, newPage, register, createBoard, consoleErrors } = suite(browser, testInfo)
  const owner = await newPage()
  await register(owner, 'toolbar_1')
  await createBoard(owner, 'Toolbar lecture')
  const editor = owner.getByTestId('board-editor')
  await editor.click()
  await owner.keyboard.type('Select these words')
  await owner.keyboard.press('Shift+Home')
  await owner.waitForTimeout(300)
  check(
    'Text is selected in the editor',
    (await owner.evaluate(() => window.getSelection()?.toString())) === 'Select these words',
  )
  check(
    'No toolbar shows while no feature has a button (C1)',
    (await owner.getByTestId('inline-toolbar').count()) === 0,
  )
  await owner.keyboard.press('End')
  await owner.keyboard.type(' and more')
  check(
    'Typing still works after selecting',
    (await editor.innerText()).trim() === 'Select these words and more',
  )
  const unexpected = consoleErrors.filter((e) => !/status of 40[0134]/.test(e))
  check('No unexpected console errors', unexpected.length === 0, unexpected.join(' | '))
})
