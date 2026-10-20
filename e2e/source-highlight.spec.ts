import { test, expect } from '@playwright/test'

const SCRIPT = `setTimeout(() => console.log('timer'), 0)\nconsole.log('sync')`

test('the highlight follows the step, shows the cause, and clears when Edit discards the Trace', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()

  const source = page.locator('.cm-source-highlight')
  const cause = page.locator('.cm-cause-highlight')
  const next = page.getByRole('button', { name: 'Next' })
  const seen = new Set<string>()
  let sawCause = false
  while (await next.isEnabled()) {
    await next.click()
    if (await source.count()) seen.add((await source.allTextContents()).join(''))
    if (await cause.count()) sawCause = true
  }
  expect(seen.size).toBeGreaterThan(1)
  expect(sawCause).toBe(true)

  await page.getByRole('button', { name: 'Edit (discards Trace)' }).click()
  await expect(source).toHaveCount(0)
  await expect(cause).toHaveCount(0)
})

test('the highlight scrolls into view when it is off-screen', async ({ page }) => {
  const filler = Array.from({ length: 80 }, (_, i) => `var v${i} = ${i}`).join('\n')
  await page.goto('/')
  await page.getByLabel('Script').fill(`${filler}\nconsole.log('far below')`)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  const next = page.getByRole('button', { name: 'Next' })
  const source = page.locator('.cm-source-highlight').filter({ hasText: 'far below' }).first()
  while (!(await source.count()) && (await next.isEnabled())) await next.click()
  await expect(source).toBeInViewport()
})
