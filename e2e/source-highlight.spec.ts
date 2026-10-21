import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

// oracle/fixtures/await-vs-then-chain.js
const AWAIT_VS_THEN = `async function f() { await Promise.resolve(); console.log('await'); }
f();
Promise.resolve().then(() => console.log('then1')).then(() => console.log('then2'));`

async function runScript(page: Page, script: string) {
  await page.goto('/')
  await page.getByLabel('Script').fill(script)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const currentEvent = (page: Page) => page.locator('[data-testid=event-list] li[aria-current=true]')

/** Presses Next until the playhead sits on the nth (1-based) event of the given kind. */
async function stepToEvent(page: Page, kind: string, nth = 1) {
  const next = page.getByRole('button', { name: 'Next', exact: true })
  const kindPattern = new RegExp(`^\\d+ ${kind}$`)
  let seen = 0
  for (let guard = 0; guard < 500; guard++) {
    const text = (await currentEvent(page).textContent())?.trim() ?? ''
    seen += kindPattern.test(text) ? 1 : 0
    if (seen === nth) return
    await next.click()
  }
  throw new Error(`event ${kind} #${nth} not reached`)
}

const sourceLine = (page: Page) => page.locator('.cm-line:has(.cm-source-highlight)')
const causeLine = (page: Page) => page.locator('.cm-line:has(.cm-cause-highlight)')

test('stepping moves the source highlight to the line being evaluated', async ({ page }) => {
  await runScript(page, AWAIT_VS_THEN)

  // First console event is the `await` continuation, then the two `then` callbacks.
  await stepToEvent(page, 'console', 1)
  await expect(page.locator('.cm-source-highlight')).toHaveText("'await'")
  await expect(sourceLine(page)).toContainText("console.log('await')")

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await stepToEvent(page, 'console')
  await expect(page.locator('.cm-source-highlight')).toHaveText("'then1'")
  await expect(sourceLine(page)).toContainText("console.log('then1')")

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await stepToEvent(page, 'console')
  await expect(page.locator('.cm-source-highlight')).toHaveText("'then2'")
})

test('a promise Job highlights the await or then that scheduled it as the cause', async ({
  page,
}) => {
  await runScript(page, AWAIT_VS_THEN)

  // Job 1 resumes `f` after its await: the cause is on the await line.
  await stepToEvent(page, 'job:begin', 1)
  await expect(causeLine(page)).toContainText('await Promise.resolve()')

  // Job 2 is the first `.then` callback: the cause is on the `.then` line.
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await stepToEvent(page, 'job:begin')
  await expect(causeLine(page)).toContainText('.then(')
})

test('a Checkpoint event shows no source highlight', async ({ page }) => {
  await runScript(page, AWAIT_VS_THEN)
  await stepToEvent(page, 'checkpoint:begin')
  await expect(page.locator('.cm-source-highlight')).toHaveCount(0)
  await expect(page.locator('.cm-cause-highlight')).toHaveCount(0)
})

test('Edit discards the Trace and clears the highlight', async ({ page }) => {
  await runScript(page, AWAIT_VS_THEN)
  await stepToEvent(page, 'console', 1)
  await expect(page.locator('.cm-source-highlight')).toHaveCount(1)
  await page.getByRole('button', { name: 'Edit (discards Trace)' }).click()
  await expect(page.locator('.cm-source-highlight')).toHaveCount(0)
})

test('the highlight scrolls into view when it is off-screen', async ({ page }) => {
  const filler = Array.from({ length: 80 }, (_, i) => `var v${i} = ${i}`).join('\n')
  await runScript(page, `${filler}\nconsole.log('far below')`)
  await stepToEvent(page, 'console')
  await expect(page.locator('.cm-source-highlight').filter({ hasText: 'far below' })).toBeInViewport()
})
