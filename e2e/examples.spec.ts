import { test, expect } from './fixtures'

test('loading an example and running it produces a Trace', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-await-vs-then').click()
  await expect(page.getByLabel('Script')).toContainText('then1')
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('event-list')).toBeVisible()
  expect(await page.getByTestId('event-list').locator('li').count()).toBeGreaterThan(1)
})

test('loading an example during replay discards the Trace', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('event-list')).toBeVisible()
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-busy-wait').click()
  await expect(page.getByTestId('event-list')).toHaveCount(0)
  await expect(page.getByLabel('Script')).toContainText('busy wait')
})

test('the infinite-loop example halts instead of hanging', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-infinite-loop').click()
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('event-list')).toBeVisible({ timeout: 25_000 })
  await expect(page.getByTestId('event-list').locator('li').last()).toContainText('run:halted')
})
