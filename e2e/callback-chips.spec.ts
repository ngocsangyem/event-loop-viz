import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { panelOfChip, runScript, stepAndSettle, stepUntilPresent } from './chip-helpers'

const TIMER = `setTimeout(() => console.log('fired'), 2000)`

test('the Web APIs card shows the timer title, its callback chip, the delay and the Browser arrow', async ({ page }) => {
  await runScript(page, TIMER)
  const card = page.getByTestId('panel-web-apis').locator('li')
  await stepUntilPresent(page, card)
  await expect(card).toContainText('setTimeout #1')
  await expect(card.locator('[data-chip-id]')).toHaveText(`() => console.log('fired')`)
  await expect(card).toContainText('2000ms')
  await expect(card).toContainText('Browser')
  await expect(card.getByRole('progressbar')).toBeVisible()
})

test('a timer chip moves Web APIs, Task Queue, Call Stack, then is gone', async ({ page }) => {
  await runScript(page, TIMER)
  const chip = `() => console.log('fired')`
  const seen: (string | null)[] = []
  const last = await page.locator('[data-testid=event-list] li[data-seq]').last().getAttribute('data-seq')
  for (let i = 0; i < 400; i++) {
    const place = await panelOfChip(page, chip)
    if (seen[seen.length - 1] !== place) seen.push(place)
    const current = await page.locator('[data-testid=event-list] li[aria-current=step]').getAttribute('data-seq')
    if (current === last) break
    await stepAndSettle(page)
  }
  expect(seen[0]).toBeNull()
  const order = seen.filter(Boolean)
  expect(order.slice(0, 3)).toEqual(['panel-web-apis', 'panel-task-queue', 'panel-call-stack'])
  expect(seen[seen.length - 1]).toBeNull()
  await expect(page.getByTestId('console-panel')).toContainText('fired')
})

test('a busy-wait keeps the Script on the stack while the due timer already waits in the Task Queue', async ({ page }) => {
  await runScript(
    page,
    `setTimeout(() => console.log('late'), 0)
const start = Date.now()
while (Date.now() - start < 3) {}`,
  )
  const queued = page.getByTestId('panel-task-queue').getByText(`() => console.log('late')`)
  await stepUntilPresent(page, queued, 1500)
  await expect(page.getByTestId('panel-call-stack')).toContainText(/script/i)
})

test('a .then callback goes to the Microtask Queue, then the Call Stack', async ({ page }) => {
  await runScript(page, `Promise.resolve().then(() => console.log('job'))`)
  const chip = `() => console.log('job')`
  await stepUntilPresent(page, page.getByTestId('panel-microtask-queue').getByText(chip))
  await stepUntilPresent(page, page.getByTestId('panel-call-stack').getByText(chip))
  expect(await panelOfChip(page, chip)).toBe('panel-call-stack')
})

for (const [locale, phrase] of [['en', 'after await'], ['vi', 'sau await']] as const) {
  test(`an await continuation chip says "${phrase}" in ${locale}`, async ({ page }) => {
    await page.addInitScript((l) => localStorage.setItem('elv-locale', l), locale)
    await runScript(page, `async function work() { await null; console.log('back') }\nwork()`)
    await stepUntilPresent(page, page.locator('[data-chip-id]', { hasText: phrase }))
  })
}

test('a long callback is cut with an ellipsis and the tooltip holds the full text', async ({ page }) => {
  const long = 'x'.repeat(200)
  await runScript(page, `setTimeout(() => console.log('${long}END'), 5)`)
  const chip = page.getByTestId('panel-web-apis').locator('[data-chip-id]')
  await stepUntilPresent(page, chip)
  expect(await chip.textContent()).toMatch(/…$/)
  expect(await chip.getAttribute('title')).toContain(`${long}END`)
})

async function openCard(page: Page, locale: 'en' | 'vi', theme: 'light' | 'dark') {
  await page.addInitScript((l) => localStorage.setItem('elv-locale', l), locale)
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await runScript(page, TIMER)
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await stepUntilPresent(page, page.getByTestId('panel-web-apis').locator('li'))
  await page.getByTestId('panel-web-apis').scrollIntoViewIfNeeded()
}

for (const width of [375, 768, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    for (const locale of ['en', 'vi'] as const) {
      test(`the Web APIs card fits at ${width}px in ${theme} / ${locale}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await openCard(page, locale, theme)
        const card = page.getByTestId('panel-web-apis').locator('li').first()
        await expect(card).toBeVisible()
        const box = (await card.boundingBox())!
        expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5)
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        expect(scrollWidth).toBeLessThanOrEqual(width)
        // Nothing inside the card pokes out of it.
        const overflow = await card.evaluate((el) => el.scrollWidth - el.clientWidth)
        expect(overflow).toBeLessThanOrEqual(1)
      })
    }
  }
}

for (const theme of ['light', 'dark'] as const) {
  for (const locale of ['en', 'vi'] as const) {
    test(`the Web APIs card has no serious axe violations in ${theme} / ${locale}`, async ({ page }) => {
      await openCard(page, locale, theme)
      const results = await new AxeBuilder({ page })
        .include('[data-testid=panel-web-apis]')
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => v.id)).toEqual([])
    })
  }
}
