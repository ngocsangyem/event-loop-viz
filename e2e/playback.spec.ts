import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

const SCRIPT = `for (let i = 0; i < 6; i++) console.log(i)`

async function runScript(page: Page) {
  await page.clock.install()
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const current = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=step]').getAttribute('data-seq')
const lastSeq = (page: Page) =>
  page.locator('[data-testid=event-list] li[data-seq]').last().getAttribute('data-seq')

test('play advances, pause freezes, play stops at the last event', async ({ page }) => {
  await runScript(page)
  const start = await current(page)
  await page.getByRole('button', { name: 'Play' }).click()
  await page.clock.runFor(1100)
  const moved = await current(page)
  expect(Number(moved)).toBeGreaterThan(Number(start))

  await page.getByRole('button', { name: 'Pause' }).click()
  await page.clock.runFor(5000)
  expect(await current(page)).toBe(moved)

  await page.getByRole('button', { name: 'Play' }).click()
  await page.clock.runFor(60_000)
  expect(await current(page)).toBe(await lastSeq(page))
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('4x covers the same span in a quarter of the time', async ({ page }) => {
  await runScript(page)
  await page.getByRole('button', { name: 'Play' }).click()
  await page.clock.runFor(2000)
  const at1x = await current(page)
  await page.getByRole('button', { name: 'Pause' }).click()

  await page.locator('body').click()
  await page.keyboard.press('Home')
  await page.locator('[data-control=playback-options]').click()
  await page.getByRole('combobox', { name: 'Speed' }).click()
  await page.getByRole('option', { name: '4×' }).click()
  await page.getByRole('button', { name: 'Play' }).click()
  await page.clock.runFor(500)
  expect(await current(page)).toBe(at1x)
})

test('keyboard: Space, arrows, Home and End', async ({ page }) => {
  await runScript(page)
  await page.locator('body').click()
  const start = Number(await current(page))

  await page.keyboard.press('ArrowRight')
  expect(Number(await current(page))).toBeGreaterThan(start)
  await page.keyboard.press('ArrowLeft')
  expect(Number(await current(page))).toBe(start)

  await page.keyboard.press('End')
  expect(await current(page)).toBe(await lastSeq(page))
  await page.keyboard.press('Home')
  expect(Number(await current(page))).toBe(start)

  await page.keyboard.press('Space')
  await page.clock.runFor(1100)
  const moved = await current(page)
  expect(Number(moved)).toBeGreaterThan(start)
  await page.keyboard.press('Space')
  await page.clock.runFor(5000)
  expect(await current(page)).toBe(moved)
})

test('shortcuts do not fire while typing in the editor', async ({ page }) => {
  await runScript(page)
  await page.getByRole('button', { name: /Edit/ }).click()
  await page.getByLabel('Script').click()
  await page.keyboard.type(' ')
  await expect(page.getByTestId('replay-banner')).toBeHidden()
})
