import { test, expect } from './fixtures'
import type { Locator, Page } from '@playwright/test'

const current = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=step]').getAttribute('data-seq')

/** Moves focus forward with Tab only, failing if the target is not reachable in order. */
async function tabTo(page: Page, target: Locator, key = 'Tab', maxPresses = 80) {
  for (let i = 0; i < maxPresses; i++) {
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return
    await page.keyboard.press(key)
  }
  throw new Error(`Tab never reached ${target}`)
}

test('load an example, run, step, jump and play with the keyboard alone', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')

  // Load an example: open the Examples menu; keyboard opening focuses the first item.
  await tabTo(page, page.getByRole('button', { name: 'Examples' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Script')).toContainText('async function f')

  // Run: it sits in the editor's header, before the Examples menu that keeps focus.
  await tabTo(page, page.getByRole('button', { name: 'Run', exact: true }), 'Shift+Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('replay-banner')).toBeVisible()

  // Focus lands on the playback controls so stepping can start at once.
  const start = await current(page)
  await expect(page.getByTestId('transport-bar').locator(':focus')).toHaveCount(1)

  // Step: Space and Enter on a focused button activate it (they must not toggle playback).
  await tabTo(page, page.getByRole('button', { name: 'Next', exact: true }))
  await page.keyboard.press('Space')
  const stepped = await current(page)
  expect(Number(stepped)).toBeGreaterThan(Number(start))
  await page.keyboard.press('Enter')
  expect(Number(await current(page))).toBeGreaterThan(Number(stepped))
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  // Jump a Tick and a Task forward.
  const beforeJump = await current(page)
  await tabTo(page, page.getByRole('button', { name: 'Forward one Tick' }))
  await page.keyboard.press('Enter')
  expect(Number(await current(page))).toBeGreaterThan(Number(beforeJump))
  const beforeTask = await current(page)
  await tabTo(page, page.getByRole('button', { name: 'Forward one Task' }))
  await page.keyboard.press('Enter')
  expect(Number(await current(page))).toBeGreaterThanOrEqual(Number(beforeTask))

  // Jump back to the start, then play from there.
  await tabTo(page, page.getByRole('button', { name: 'Go to start' }), 'Shift+Tab')
  await page.keyboard.press('Enter')
  const home = await current(page)
  await tabTo(page, page.getByRole('button', { name: 'Play' }))
  await page.keyboard.press('Enter')
  await page.clock.runFor(1500)
  expect(Number(await current(page))).toBeGreaterThan(Number(home))
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('Tab leaves the editor instead of trapping focus', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').focus()
  await page.keyboard.press('Tab')
  const inEditor = await page.evaluate(() => !!document.activeElement?.closest('.cm-editor'))
  expect(inEditor).toBe(false)
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByLabel('Script')).toBeFocused()
})

test('editing after a replay returns focus to the editor', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await page.getByRole('button', { name: 'Edit (discards Trace)' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Script')).toBeFocused()
})

test('the current step explanation is announced through a live region', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()

  const live = page.getByTestId('step-announcer')
  await expect(live).toHaveAttribute('role', 'status')
  await expect(live).toHaveAttribute('aria-live', 'polite')

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  const detail = await page.getByTestId('event-explanation').innerText()
  expect(detail.length).toBeGreaterThan(0)
  await expect(live).toHaveText(detail)

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  const detail2 = await page.getByTestId('event-explanation').innerText()
  await expect(live).toHaveText(detail2)
})
