import { rmSync } from 'node:fs'
import { test } from '@playwright/test'

// Tests apne browser contexts khud banate hain (kai users ek saath). Unki video yahan record hoti hai:
// test fail ho to har video report me lagti hai, pass ho to mita di jati hai.
const open = []

export async function newContext(browser, options = {}) {
  const dir = test.info().outputPath('videos')
  const ctx = await browser.newContext({
    recordVideo: { dir, size: { width: 1280, height: 800 } },
    ...options,
  })
  open.push(ctx)
  return ctx
}

/** Har spec file me ek dafa bulao (module ek hi dafa load hota hai, is liye hook file-wise lagta hai) */
export function recordVideos() {
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures ka pehla argument object hi hona chahiye
  test.afterEach(async ({}, testInfo) => {
    const pages = open.flatMap((ctx) => ctx.pages())
    await Promise.all(open.splice(0).map((ctx) => ctx.close().catch(() => {})))
    const failed = testInfo.errors.length > 0 || testInfo.status !== testInfo.expectedStatus
    if (!failed) {
      rmSync(testInfo.outputPath('videos'), { recursive: true, force: true })
      return
    }
    for (const [i, page] of pages.entries()) {
      const path = await page
        .video()
        ?.path()
        .catch(() => null)
      if (path) await testInfo.attach(`video-${i + 1}`, { path, contentType: 'video/webm' })
    }
  })
}
