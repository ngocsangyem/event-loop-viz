import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

const SCRIPT = `const p = Promise.resolve(1)
p.then(() => console.log('then'))`

async function chooseVietnamese(page: Page) {
  // The header's [L] toggle flips EN to VI.
  await page.getByTestId('locale').click()
}

test('switching to Vietnamese translates labels, event explanations and <html lang>', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible()

  await chooseVietnamese(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.getByRole('button', { name: 'Chạy', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ví dụ' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Trình soạn code' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Call Stack' }).getByText('Trống')).toBeVisible()

  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Chạy' }).click()
  await expect(page.getByTestId('replay-banner')).toContainText('Chỉ đọc trong lúc replay.')
  await expect(page.getByRole('button', { name: 'Phát', exact: true })).toBeVisible()

  // Step to the first Job the Script queues; its explanation is Vietnamese, the kind is data.
  await page.locator('[data-testid=event-list] li[data-kind="job:enqueue"]').first().getByRole('button').click()
  await expect(page.getByTestId('event-explanation')).toContainText('vào hàng đợi để chạy reaction')
  await expect(page.getByTestId('event-explanation')).not.toContainText('A Job')
  await expect(page.getByRole('heading', { name: /job:enqueue/ })).toBeVisible()
})

test('the chosen language is remembered after a reload', async ({ page }) => {
  await page.goto('/')
  await chooseVietnamese(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.getByRole('button', { name: 'Chạy' })).toBeVisible()
})
