import AxeBuilder from '@axe-core/playwright'
import { test, expect, pressStep } from './fixtures'
import type { Page } from '@playwright/test'

const SCRIPT = `setTimeout(() => console.log('timer'), 10)
Promise.resolve().then(() => console.log('job'))
console.log('sync')`

async function openDiagram(page: Page) {
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  await page.getByTestId('view-diagram').click()
  await expect(page.getByTestId('diagram')).toBeVisible()
}

const edge = (page: Page, id: string) => page.getByTestId(`diagram-edge-${id}`)
const node = (page: Page, id: string) => page.getByTestId(`diagram-node-${id}`)

/** Steps forward until the edge is active; fails if the Trace ends first. */
async function stepUntilActive(page: Page, id: string) {
  for (let i = 0; i < 120; i++) {
    if ((await edge(page, id).getAttribute('data-active')) === 'true') return
    await pressStep(page, 'next')
  }
  throw new Error(`edge ${id} never became active`)
}

test('the Diagram view is remembered across a reload', async ({ page }) => {
  await openDiagram(page)
  await page.reload()
  await expect(page.getByTestId('diagram')).toBeVisible()
  await page.getByTestId('view-panels').click()
  await expect(page.getByTestId('diagram')).toHaveCount(0)
})

test('stepping a Run lights the edges and cards each step uses', async ({ page }) => {
  await openDiagram(page)
  await expect(edge(page, 'register')).toHaveAttribute('data-active', 'false')

  await stepUntilActive(page, 'register')
  await expect(node(page, 'webapis')).toHaveAttribute('data-lit', 'true')
  await expect(node(page, 'taskq')).toHaveAttribute('data-lit', 'false')

  await stepUntilActive(page, 'queue-job')
  await expect(node(page, 'microq')).toHaveAttribute('data-lit', 'true')

  await stepUntilActive(page, 'log')
  await expect(node(page, 'console')).toHaveAttribute('data-lit', 'true')
  await expect(node(page, 'console')).toHaveAttribute('data-refused', 'false')

  await stepUntilActive(page, 'run-job')
  await expect(node(page, 'stack')).toHaveAttribute('data-lit', 'true')

  // The timer waits in Web APIs until it is due; its Task is queued then, and runs on a later step.
  await stepUntilActive(page, 'timer-fires')
  await expect(node(page, 'taskq')).toHaveAttribute('data-lit', 'true')
  await expect(edge(page, 'next-task')).toHaveAttribute('data-active', 'false')
  await stepUntilActive(page, 'next-task')
  await expect(edge(page, 'run-task')).toHaveAttribute('data-active', 'true')
  for (const id of ['taskq', 'loop', 'stack']) await expect(node(page, id)).toHaveAttribute('data-lit', 'true')
})

test('cards show the state and the picture names the step', async ({ page }) => {
  await openDiagram(page)
  await stepUntilActive(page, 'register')
  await expect(node(page, 'webapis')).toContainText('setTimeout')
  await expect(page.getByRole('img', { name: /Call Stack → Web APIs/ })).toBeVisible()
  await expect(page.getByTestId('diagram-listing')).toContainText('Web APIs: setTimeout')
})

test('an uncaught exception is a refusal on the Console', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`throw new Error('boom')`)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  await page.getByTestId('view-diagram').click()
  await stepUntilActive(page, 'log')
  await expect(edge(page, 'log')).toHaveAttribute('data-refused', 'true')
  await expect(node(page, 'console')).toHaveAttribute('data-refused', 'true')
})

test('stepping back shows the still picture of that event', async ({ page }) => {
  await openDiagram(page)
  await stepUntilActive(page, 'queue-job')
  await pressStep(page, 'next')
  await pressStep(page, 'prev')
  await expect(edge(page, 'queue-job')).toHaveAttribute('data-active', 'true')
  // No signal dot is left travelling after the seek.
  await expect(page.locator('[data-part=signal]')).toHaveCSS('opacity', '0')
})

test('fast stepping leaves no animation running', async ({ page }) => {
  await openDiagram(page)
  for (let i = 0; i < 12; i++) await pressStep(page, 'next')
  await expect
    .poll(() => page.evaluate(() => document.querySelector('[data-testid=diagram]')!.getAnimations({ subtree: true }).length), {
      timeout: 4000,
    })
    .toBe(0)
})

test('with reduced motion the diagram is a still image that keeps the meaning', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDiagram(page)
  await stepUntilActive(page, 'register')
  await expect(node(page, 'webapis')).toHaveAttribute('data-lit', 'true')
  await expect(page.locator('[data-testid=diagram-edge-register] [data-part=line-hot]')).toHaveCSS('opacity', '1')
  await expect(page.locator('[data-testid=diagram-node-webapis] [data-part=draw-cw]')).toHaveCSS('opacity', '1')
  expect(
    await page.evaluate(() => document.querySelector('[data-testid=diagram]')!.getAnimations({ subtree: true }).length),
  ).toBe(0)
})

test('the phone layout is vertical and stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await openDiagram(page)
  await expect(page.getByTestId('diagram')).toHaveAttribute('data-layout', 'narrow')
  const box = await page.getByTestId('diagram').boundingBox()
  expect(box!.x + box!.width).toBeLessThanOrEqual(375)
})

for (const theme of ['light', 'dark'] as const) {
  test(`axe finds no serious violations on the diagram in the ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await openDiagram(page)
    await stepUntilActive(page, 'queue-job')
    const results = await new AxeBuilder({ page })
      .include('[data-testid=diagram]')
      .exclude('.vue-devtools__anchor')
      .analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => v.id)).toEqual([])
  })
}
