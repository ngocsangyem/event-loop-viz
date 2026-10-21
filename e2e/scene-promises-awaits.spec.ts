import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { preferSceneView } from './reveal-panel'

// The 3D Scene is opt-in; these specs exercise it.
test.beforeEach(({ page }) => preferSceneView(page))

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

const current = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')
const currentRow = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=true]').innerText()
const lastSeq = (page: Page) =>
  page.locator('[data-testid=event-list] li').last().getAttribute('data-seq')

/** Steps forward until `locator` has `count` matches; fails at the end of the Trace. */
async function stepUntilCount(page: Page, locator: Locator, count: number) {
  const last = await lastSeq(page)
  for (let i = 0; i < 400; i++) {
    if ((await locator.count()) === count) return
    expect(await current(page), 'reached the end without seeing it').not.toBe(last)
    await page.getByRole('button', { name: 'Next' }).click()
  }
  throw new Error('not seen within 400 steps')
}

test('a suspended async function waits on its promise and resumes at await:resume', async ({
  page,
}) => {
  await runScript(page, AWAIT_VS_THEN)
  // Show every event so the resume step itself can be landed on.
  await page.getByLabel('Show all events').check()

  const waiting = page.getByTestId('scene-suspended-await')
  await stepUntilCount(page, waiting, 1)
  await expect(waiting).toHaveAttribute('data-label', 'f')
  await expect(waiting).toHaveAttribute('data-pid', /^p\d+$/)
  const pid = await waiting.getAttribute('data-pid')
  // The tag hangs beside the cradle of the promise the function waits on, which is pending.
  const awaited = page.locator(`[data-testid=scene-promise][data-pid=${pid}]`)
  await expect(awaited).toHaveAttribute('data-waiting', '')

  // It stays parked through other work and is released at the await:resume step.
  await stepUntilCount(page, waiting, 0)
  expect(await currentRow(page)).toContain('await:resume')
  await expect(awaited).not.toHaveAttribute('data-waiting', '')
  await expect(awaited).toHaveAttribute('data-state', 'fulfilled')
})

test('a rejected promise looks different from a fulfilled one', async ({ page }) => {
  await runScript(
    page,
    `const ok = Promise.resolve(1)
const bad = Promise.reject(new Error('nope'))
bad.catch(() => {})`,
  )
  const rejected = page.locator('[data-testid=scene-promise][data-state=rejected]')
  const fulfilled = page.locator('[data-testid=scene-promise][data-state=fulfilled]')
  await stepUntilCount(page, rejected, 1)
  await stepUntilCount(page, fulfilled, 1)

  await expect(rejected).toContainText('rejected')
  await expect(fulfilled).toContainText('fulfilled')
  const rim = (cell: Locator) =>
    cell.locator('.iso-line').last().evaluate((node) => getComputedStyle(node).stroke)
  expect(await rim(rejected)).not.toBe(await rim(fulfilled))
})

test('an async generator drum shows its state', async ({ page }) => {
  await runScript(
    page,
    `async function* g() { yield 'a'; yield 'b' }
const it = g()
it.next()`,
  )
  const drum = page.getByTestId('scene-async-generator')
  await stepUntilCount(page, drum, 1)
  await expect(drum).toHaveAttribute('data-gid', /^g/)
  await expect(drum).toHaveAttribute('data-state', /running|yielded|awaiting-return/)
})
