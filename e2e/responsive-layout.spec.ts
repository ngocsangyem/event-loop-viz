import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

const MIN_TAP = 44

test('phone width never scrolls horizontally and every transport control is tappable', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()

  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client)

  const controls = page.getByTestId('transport-bar').locator('button, select')
  expect(await controls.count()).toBeGreaterThanOrEqual(10)
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded()
    const box = await control.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TAP)
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TAP)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
  }
})

test('an example can be run and stepped through by touch at phone width', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-await-vs-then').tap()
  await page.getByRole('button', { name: 'Run' }).tap()
  await expect(page.getByTestId('event-list')).toBeVisible()

  const current = () =>
    page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')
  const start = await current()
  await page.getByRole('button', { name: 'Next' }).tap()
  const next = await current()
  expect(Number(next)).toBeGreaterThan(Number(start))
  await page.getByRole('button', { name: 'Prev' }).tap()
  expect(await current()).toBe(start)
  await expect(page.getByTestId('console-panel')).toBeAttached()
})
