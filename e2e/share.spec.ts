import { test, expect } from '@playwright/test'
import { openBottomTab } from './bottom-tabs'

// Unicode plus enough filler to push the link past a few kB.
const FILLER = Array.from({ length: 120 }, (_, i) => `// filler ${i} ✓ ünï`).join('\n')
const SCRIPT = `${FILLER}
setTimeout(() => console.log('timer 日本語 🚀'), 5)
Promise.resolve().then(() => console.log('job'))
console.log('sync')`

test('a share link opened in a fresh context reproduces the Trace and output', async ({
  page,
  browser,
}) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('event-list')).toBeVisible()
  const originalEvents = await page.getByTestId('event-list').locator('li').count()
  await page.getByRole('button', { name: 'Share' }).click()
  const url = await page.getByTestId('share-url').inputValue()
  expect(url.length).toBeGreaterThan(3000)

  // Output of the original is the full console after stepping to the end.
  for (let i = 1; i < originalEvents; i++) await page.getByRole('button', { name: 'Next' }).click()
  const originalRows = await page.getByTestId('event-list').locator('li').allInnerTexts()
  await openBottomTab(page, 'Console')
  const originalConsole = await page.getByTestId('console-panel').innerText()

  const context = await browser.newContext()
  const fresh = await context.newPage()
  await fresh.goto(url)
  await expect(fresh.getByTestId('event-list')).toBeVisible()
  await expect(fresh.getByTestId('event-list').locator('li')).toHaveCount(originalEvents)
  // Same Script and settings give the same Trace: every event row reads identically.
  await expect(fresh.getByTestId('event-list').locator('li')).toHaveText(originalRows)
  for (let i = 1; i < originalEvents; i++) await fresh.getByRole('button', { name: 'Next' }).click()
  await openBottomTab(fresh, 'Console')
  await expect(fresh.getByTestId('console-panel').locator('li')).toHaveText(originalConsole.split('\n'))
  expect(originalConsole).toContain('timer 日本語 🚀')
  await context.close()
})
