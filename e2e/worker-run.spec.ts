import { test, expect } from '@playwright/test'

// Long enough that the Run is still computing while the test pokes the page.
const LONG_LOOP = `let n = 0; for (let i = 0; i < 100000; i++) { n += i }; console.log(n)`
const NEVER_ENDS = `for (;;) {}`

test('the UI stays responsive while a Run computes', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(LONG_LOOP)
  await page.getByRole('button', { name: 'Run' }).click()
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
  await expect(page.getByLabel('Script')).toHaveValue('console.log(1)')
})

test('Cancel ends the Run without a Trace', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(NEVER_ENDS)
  await page.getByRole('button', { name: 'Run' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('button', { name: 'Cancel' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled()
  await expect(page.getByTestId('event-list')).toHaveCount(0)
})

test('the watchdog stops a stuck Run and explains that no Trace exists', async ({ page }) => {
  await page.goto('/?watchdogMs=500')
  await page.getByLabel('Script').fill(NEVER_ENDS)
  await page.getByRole('button', { name: 'Run' }).click()

  await expect(page.getByRole('alert')).toContainText('watchdog')
  await expect(page.getByRole('alert')).toContainText('no Trace')
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled()
})
