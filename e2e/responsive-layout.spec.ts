import { test, expect } from './fixtures'
import { revealPanel } from './reveal-panel'

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

const MIN_TAP = 44
// Layout can land a 44 px box on 43.999..., so compare with a sub-pixel tolerance.
const SUBPIXEL = 0.5

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

  // The five 52px targets (Tick, Step, Play) and the PLAYBACK word (speed, Auto-play); Start,
  // End and the Task jumps are keyboard extras that hide on a phone. The scrubber's family
  // markers are a pointer shortcut.
  const controls = page.getByTestId('transport-bar').locator('[data-control]:visible, [role=combobox]:visible')
  expect(await controls.count()).toBeGreaterThanOrEqual(6)
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded()
    const box = await control.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TAP - SUBPIXEL)
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TAP - SUBPIXEL)
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
    page.locator('[data-testid=event-list] li[aria-current=step]').getAttribute('data-seq')
  const start = await current()
  await page.getByRole('button', { name: 'Next' }).tap()
  const next = await current()
  expect(Number(next)).toBeGreaterThan(Number(start))
  await page.getByRole('button', { name: 'Prev' }).tap()
  expect(await current()).toBe(start)
  await revealPanel(page, 'Console')
  await expect(page.getByTestId('console-panel')).toBeAttached()
})
