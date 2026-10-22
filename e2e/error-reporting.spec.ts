import { test, expect } from './fixtures'
import { revealPanel } from './reveal-panel'

test('a Script using Worker shows the pre-run notice and the replay console shows the error', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`new Worker('w.js')`)
  await expect(page.getByTestId('unsupported-api-notice')).toContainText('Worker')

  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  await expect(page.getByTestId('unsupported-api-notice')).toContainText('Worker')
  // The console shows lines up to the playhead; step to the end.
  const next = page.getByRole('button', { name: 'Next' })
  while (await next.isEnabled()) await next.click()
  await revealPanel(page, 'Console')
  await expect(page.getByTestId('console-panel')).toContainText(
    'Uncaught UnsupportedApiError: Worker is not supported by the simulator',
  )
})

test('a Script without Unsupported APIs shows no notice', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`console.log(1)`)
  await expect(page.getByTestId('unsupported-api-notice')).toBeHidden()
})

test('a syntax error is marked at its line and column and creates no Trace', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`console.log(1)\nlet x = ;`)
  await page.getByRole('button', { name: 'Run' }).click()

  await expect(page.getByRole('alert')).toContainText('line 2')
  await expect(page.locator('.cm-syntax-error-line')).toHaveText('let x = ;')
  await expect(page.locator('.cm-syntax-error-mark')).toHaveText(';')
  await expect(page.getByTestId('replay-banner')).toBeHidden()
  await expect(page.getByTestId('event-list')).toBeHidden()

  await page.getByLabel('Script').click()
  await page.keyboard.type(' ')
  await expect(page.locator('.cm-syntax-error-line')).toHaveCount(0)
})

test('the supported-API list is reachable from the UI', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Supported APIs').click()
  await expect(page.getByTestId('supported-apis')).toContainText('setTimeout')
  await expect(page.getByTestId('supported-apis')).toContainText('queueMicrotask')
})
