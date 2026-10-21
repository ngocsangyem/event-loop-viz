import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

async function loadInfiniteLoop(page: Page) {
  await page.goto('/')
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-infinite-loop').click()
}

async function setNodeBudget(page: Page, value: string) {
  await page.getByText('Advanced settings', { exact: true }).click()
  await page.getByTestId('setting-nodes').fill(value)
}

test('lowering the node Budget halts the infinite loop earlier and the banner names it', async ({
  page,
}) => {
  await loadInfiniteLoop(page)
  await setNodeBudget(page, '5000')
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('halt-banner')).toHaveText(
    'Halted: the node Budget (5,000 nodes) was exceeded.',
    { timeout: 10_000 },
  )
})

test('changed Budgets travel in a share link', async ({ page, browser }) => {
  await loadInfiniteLoop(page)
  await setNodeBudget(page, '3000')
  await page.getByRole('button', { name: 'Share' }).click()
  const url = await page.getByTestId('share-url').inputValue()

  const recipient = await browser.newPage()
  await recipient.goto(url)
  await expect(recipient.getByTestId('halt-banner')).toContainText('(3,000 nodes)', {
    timeout: 10_000,
  })
  await recipient.close()
})

test('a long Trace renders only the rows in view and scrolls to the end', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill('for (let i = 0; i < 2000; i++) console.log(i)')
  await page.getByRole('button', { name: 'Run' }).click()
  const list = page.getByTestId('event-list')
  await expect(list).toBeVisible()
  const total = Number(await list.getAttribute('data-total'))
  expect(total).toBeGreaterThan(1000)
  expect(await list.locator('li').count()).toBeLessThan(100)

  await page.getByTestId('event-list-scroller').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(list.locator('li').last()).toContainText('run:halted')
})
