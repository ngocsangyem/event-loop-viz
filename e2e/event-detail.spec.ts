import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SCRIPT = `const p = Promise.resolve(1)
p.then(() => console.log('then'))
setTimeout(() => console.log('timer'), 0)
new Promise(() => {})`

async function runScript(page: Page) {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const rows = (page: Page) => page.locator('[data-testid=event-list] li')
const current = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')

test('selecting an event shows its explanation, spec link and cause', async ({ page }) => {
  await runScript(page)
  await rows(page).filter({ hasText: 'job:enqueue' }).first().getByRole('button').click()

  await expect(page.getByTestId('event-explanation')).toContainText('A Job')
  await expect(page.getByTestId('event-explanation')).not.toContainText('undefined')
  const link = page.getByTestId('event-spec-link')
  await expect(link).toHaveAttribute('href', /^https:\/\/(tc39\.es\/ecma262|html\.spec\.whatwg\.org)\//)
  await expect(page.getByTestId('event-payload')).toContainText('"jobId"')
  await expect(page.getByTestId('event-cause').getByRole('button')).toBeVisible()

  // Following the cause moves the playhead to the event that scheduled this one.
  const before = await current(page)
  await page.getByTestId('event-cause').getByRole('button').click()
  expect(await current(page)).not.toBe(before)
})

test('family chips hide and show events', async ({ page }) => {
  await runScript(page)
  await expect(rows(page).filter({ hasText: 'console' }).first()).toBeVisible()
  const chip = page.getByTestId('family-filters').locator('[data-family=console]')
  await chip.click()
  await expect(rows(page).filter({ hasText: /\d+ console$/ })).toHaveCount(0)
  await expect(rows(page).filter({ hasText: 'task:begin' }).first()).toBeVisible()
  await chip.click()
  await expect(rows(page).filter({ hasText: /\d+ console$/ }).first()).toBeVisible()
})

test('show all events makes Bookkeeping Events steppable', async ({ page }) => {
  await runScript(page)
  const visibleCount = await rows(page).count()
  await expect(page.locator('[data-testid=event-list] li[data-visible=false]')).toHaveCount(0)

  await page.getByLabel('Show all events').check()
  const allCount = await rows(page).count()
  expect(allCount).toBeGreaterThan(visibleCount)

  // Step through everything: the playhead must land on at least one Bookkeeping Event.
  await page.locator('body').click()
  await page.keyboard.press('Home')
  let landedOnBookkeeping = 0
  for (let i = 0; i < allCount; i++) {
    landedOnBookkeeping += await page
      .locator('[data-testid=event-list] li[aria-current=true][data-visible=false]')
      .count()
    await page.keyboard.press('ArrowRight')
  }
  expect(landedOnBookkeeping).toBeGreaterThan(0)

  await page.getByLabel('Show all events').uncheck()
  await expect(rows(page)).toHaveCount(visibleCount)
})
