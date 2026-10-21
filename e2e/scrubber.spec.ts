import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

const SCRIPT = `setTimeout(() => console.log('timer'), 10)
Promise.resolve().then(() => console.log('a')).then(() => console.log('b'))
console.log('sync')`

async function runScript(page: Page) {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const currentRow = (page: Page) => page.locator('[data-testid=event-list] li[aria-current=true]')
const currentSeq = async (page: Page) => Number(await currentRow(page).getAttribute('data-seq'))
const currentKind = async (page: Page) => (await currentRow(page).innerText()).split(' ')[1]

test('the scrubber shows a marker for each event family of the Run', async ({ page }) => {
  await runScript(page)
  for (const family of ['task', 'job', 'timer', 'console']) {
    await expect(page.locator(`[data-testid=scrubber] [data-family=${family}]`).first()).toBeVisible()
  }
})

test('dragging the scrubber to a marker shows that event as current', async ({ page }) => {
  await runScript(page)
  const slider = page.getByLabel('Timeline')
  for (const family of ['timer', 'job']) {
    // The page height follows the panels' content, so the slider's position is read every round.
    const sliderBox = (await slider.boundingBox())!
    const marker = page.locator(`[data-testid=scrubber] [data-family=${family}]`).first()
    const seq = Number(await marker.getAttribute('data-seq'))
    const target = (await marker.boundingBox())!
    // The thumb starts or rests at the left end (half a thumb in); drag it onto the marker.
    await page.mouse.move(sliderBox.x + 8, sliderBox.y + sliderBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x + target.width / 2, sliderBox.y + sliderBox.height / 2, { steps: 8 })
    await page.mouse.up()
    expect(await currentSeq(page)).toBe(seq)
    await page.getByRole('button', { name: 'Go to start' }).click()
  }
})

test('clicking a marker seeks to its event', async ({ page }) => {
  await runScript(page)
  const marker = page.locator('[data-testid=scrubber] [data-family=console]').last()
  const seq = Number(await marker.getAttribute('data-seq'))
  await marker.click()
  expect(await currentSeq(page)).toBe(seq)
})

test('Tick and Task jumps by button land on job:begin and task:begin', async ({ page }) => {
  await runScript(page)
  await page.getByRole('button', { name: 'Forward one Task' }).click()
  expect(await currentKind(page)).toBe('task:begin')
  await page.getByRole('button', { name: 'Forward one Task' }).click()
  expect(await currentKind(page)).toBe('task:begin')
  await page.getByRole('button', { name: 'Back one Task' }).click()
  expect(await currentKind(page)).toBe('task:begin')

  await page.getByRole('button', { name: 'Go to start' }).click()
  await page.getByRole('button', { name: 'Forward one Tick' }).click()
  expect(await currentKind(page)).toBe('job:begin')
  const firstTick = await currentSeq(page)
  await page.getByRole('button', { name: 'Forward one Tick' }).click()
  expect(await currentKind(page)).toBe('job:begin')
  expect(await currentSeq(page)).toBeGreaterThan(firstTick)
  await page.getByRole('button', { name: 'Back one Tick' }).click()
  expect(await currentSeq(page)).toBe(firstTick)

  await page.getByRole('button', { name: 'Go to end' }).click()
  expect(await currentSeq(page)).toBe(
    Number(await page.locator('[data-testid=event-list] li').last().getAttribute('data-seq')),
  )
})

test('Tick and Task jumps by keyboard (Shift and Alt arrows)', async ({ page }) => {
  await runScript(page)
  await page.locator('body').click()

  await page.keyboard.press('Alt+ArrowRight')
  expect(await currentKind(page)).toBe('task:begin')
  const task = await currentSeq(page)

  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+ArrowRight')
  expect(await currentKind(page)).toBe('job:begin')
  const tick = await currentSeq(page)
  await page.keyboard.press('Shift+ArrowRight')
  expect(await currentSeq(page)).toBeGreaterThan(tick)
  await page.keyboard.press('Shift+ArrowLeft')
  expect(await currentSeq(page)).toBe(tick)

  await page.keyboard.press('Alt+ArrowLeft')
  expect(await currentSeq(page)).toBe(task)
})
