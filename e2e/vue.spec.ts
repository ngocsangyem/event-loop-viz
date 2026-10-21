import { test, expect } from '@playwright/test'
import { revealPanel } from './reveal-panel'

const SCRIPT = `setTimeout(() => console.log('timer'), 10); console.log('sync')`

test('steps through a Trace to the end and shows the Run Observable Output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()

  const next = page.getByRole('button', { name: 'Next' })
  // The Run is asynchronous: wait for the Trace before stepping.
  await expect(next).toBeEnabled()
  while (await next.isEnabled()) await next.click()

  await revealPanel(page, 'Console')
  await expect(page.getByTestId('console-panel').locator('li')).toHaveText([
    'log: sync',
    'log: timer',
  ])
})

test('Prev returns to the earlier event position and console content', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()

  const next = page.getByRole('button', { name: 'Next' })
  const prev = page.getByRole('button', { name: 'Prev' })
  await revealPanel(page, 'Console')
  const current = page.locator('[data-testid="event-list"] [aria-current="true"]')
  const consoleLines = page.getByTestId('console-panel').locator('li')

  await expect(next).toBeEnabled()
  // Step until the first console line shows, remember that position.
  while ((await consoleLines.count()) < 1) await next.click()
  const earlierIndex = await current.getAttribute('data-seq')
  const earlierConsole = ['log: sync']
  await expect(consoleLines).toHaveText(earlierConsole)

  while (await next.isEnabled()) await next.click()
  await expect(consoleLines).toHaveCount(2)

  while ((await current.getAttribute('data-seq')) !== earlierIndex) await prev.click()
  await expect(consoleLines).toHaveText(earlierConsole)
})
