import { test, expect } from '@playwright/test'

async function runExample(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Script').fill(`console.log('sync')`)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

test('the bottom panel offers Console and Events tabs, one panel visible at a time', async ({
  page,
}) => {
  await runExample(page)
  const tabs = page.getByRole('tablist', { name: 'Run output' }).getByRole('tab')
  await expect(tabs).toHaveText(['Console', 'Events'])

  // Events is selected first and shows the list with the detail pane beside it.
  await expect(page.getByRole('tab', { name: 'Events' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel', { name: 'Events' })).toBeVisible()
  await expect(page.getByTestId('event-list')).toBeVisible()
  await expect(page.getByTestId('event-detail')).toBeVisible()
  await expect(page.getByText('No console output at this step.')).toBeHidden()

  await page.getByRole('tab', { name: 'Console' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Console' })).toBeVisible()
  await expect(page.getByText('No console output at this step.')).toBeVisible()
  await expect(page.getByTestId('event-list')).toBeHidden()
  await expect(page.getByTestId('event-detail')).toBeHidden()
})

test('arrow keys, Home and End move between tabs and wrap around', async ({ page }) => {
  await runExample(page)
  const consoleTab = page.getByRole('tab', { name: 'Console' })
  const eventsTab = page.getByRole('tab', { name: 'Events' })

  await eventsTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(consoleTab).toBeFocused()
  await expect(consoleTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel', { name: 'Console' })).toBeVisible()

  await page.keyboard.press('ArrowLeft')
  await expect(eventsTab).toBeFocused()
  await expect(page.getByTestId('event-list')).toBeVisible()

  await page.keyboard.press('Home')
  await expect(consoleTab).toBeFocused()
  await page.keyboard.press('End')
  await expect(eventsTab).toBeFocused()

  // Only the selected tab is in the Tab order (roving tabindex).
  await expect(consoleTab).toHaveAttribute('tabindex', '-1')
  await expect(eventsTab).toHaveAttribute('tabindex', '0')
})

test('arrow keys on the tab strip do not step the playback', async ({ page }) => {
  await runExample(page)
  const current = () =>
    page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')
  const before = await current()
  await page.getByRole('tab', { name: 'Events' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  expect(await current()).toBe(before)
})
