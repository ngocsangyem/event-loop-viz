import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

// Never finishes on its own. The node Budget is raised so far that it cannot trip first: the Run
// ends only through Cancel or the watchdog, whatever the machine's speed.
const NEVER_ENDS = `for (;;) {}`
const UNREACHABLE_NODE_BUDGET = '1000000000000000'

async function startNeverEndingRun(page: Page, path = '/') {
  await page.goto(path)
  await page.getByText('Advanced settings', { exact: true }).click()
  await page.getByTestId('setting-nodes').fill(UNREACHABLE_NODE_BUDGET)
  await page.getByLabel('Script').fill(NEVER_ENDS)
  await page.getByRole('button', { name: 'Run' }).click()
}

test('the UI stays responsive while a Run computes', async ({ page }) => {
  await startNeverEndingRun(page)
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

  // A main-thread task scheduled now must run promptly even though the engine is busy.
  const delayMs = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const start = performance.now()
        setTimeout(() => resolve(performance.now() - start), 0)
      }),
  )
  expect(delayMs).toBeLessThan(100)

  // And a control responds: typing in the editor updates it while the Run is in flight.
  await page.getByLabel('Script').fill('console.log(1)')
  await expect(page.getByLabel('Script')).toContainText('console.log(1)')
  await page.getByRole('button', { name: 'Cancel' }).click()
})

test('Cancel ends the Run without a Trace', async ({ page }) => {
  await startNeverEndingRun(page)
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('button', { name: 'Cancel' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled()
  await expect(page.getByTestId('event-list')).toHaveCount(0)
})

test('the watchdog stops a stuck Run and explains that no Trace exists', async ({ page }) => {
  await startNeverEndingRun(page, '/?watchdogMs=500')

  await expect(page.getByRole('alert')).toContainText('watchdog')
  await expect(page.getByRole('alert')).toContainText('no Trace')
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled()
})
