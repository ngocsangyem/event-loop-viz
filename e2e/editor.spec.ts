import { test, expect } from '@playwright/test'

const SCRIPT = `console.log('sync')`

test('typing during replay is blocked and the read-only banner is shown', async ({ page }) => {
  await page.goto('/')
  const editor = page.getByLabel('Script')
  await editor.fill(SCRIPT)
  await expect(page.getByTestId('replay-banner')).toBeHidden()
  await page.getByRole('button', { name: 'Run' }).click()

  await expect(page.getByTestId('replay-banner')).toBeVisible()
  await editor.click()
  await page.keyboard.type('XYZ')
  await expect(editor).toHaveText(SCRIPT)
})

test('Edit discards the Trace and disables the controls until the next Run', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()

  await page.getByRole('button', { name: 'Edit (discards Trace)' }).click()
  await expect(page.getByTestId('replay-banner')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled()
  await expect(page.getByTestId('event-list')).toBeHidden()

  await page.getByLabel('Script').click()
  await page.keyboard.type('// edited')
  await expect(page.getByLabel('Script')).toContainText('// edited')

  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
})

test('a keyboard shortcut runs the Script', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByLabel('Script').press('ControlOrMeta+Enter')
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  await expect(page.getByTestId('event-list')).toBeVisible()
})
