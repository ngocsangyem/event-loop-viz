import { test, expect } from './fixtures'
import type { Locator, Page } from '@playwright/test'
import { preferSceneView } from './reveal-panel'

// The 3D Scene is opt-in; these specs exercise it.
test.beforeEach(({ page }) => preferSceneView(page))

async function runScript(page: Page, script: string) {
  await page.goto('/')
  await page.getByLabel('Script').fill(script)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const current = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')
const lastSeq = (page: Page) =>
  page.locator('[data-testid=event-list] li').last().getAttribute('data-seq')

/** Steps the replay forward until `locator` matches something; fails at the end of the Trace. */
async function stepUntilPresent(page: Page, locator: Locator) {
  const last = await lastSeq(page)
  for (let i = 0; i < 400; i++) {
    if ((await locator.count()) > 0) return
    expect(await current(page), 'reached the end without seeing it').not.toBe(last)
    await page.getByRole('button', { name: 'Next' }).click()
  }
  throw new Error('not seen within 400 steps')
}

test('a Job waits in the microtask queue, then moves to the run pad when it begins', async ({
  page,
}) => {
  await runScript(page, `Promise.resolve().then(() => console.log('job'))`)

  const queued = page.getByTestId('scene-job')
  await stepUntilPresent(page, queued)
  await expect(queued).toHaveCount(1)
  await expect(queued).toHaveAttribute('data-kind', 'reaction')
  await expect(queued).toContainText('reaction')
  const jobId = await queued.getAttribute('data-job-id')
  await expect(page.getByTestId('scene-running-job')).toHaveCount(0)

  await stepUntilPresent(page, page.getByTestId('scene-running-job'))
  await expect(page.getByTestId('scene-job')).toHaveCount(0)
  await expect(page.getByTestId('scene-running-job')).toHaveAttribute('data-job-id', jobId!)
  await expect(page.getByTestId('scene-running-job')).toHaveAttribute('data-kind', 'reaction')
})

test('a timer shows its due time on the shelf and leaves it when it fires', async ({ page }) => {
  await runScript(page, `setTimeout(() => console.log('fired'), 100)`)

  const timer = page.getByTestId('scene-timer')
  await stepUntilPresent(page, timer)
  await expect(timer).toHaveCount(1)
  await expect(timer).toHaveAttribute('data-due', '100ms')
  await expect(timer).toContainText('100ms')
  await expect(page.getByTestId('scene-clock')).toHaveText('0ms')

  // The timer leaves the shelf at timer:fire, and the Virtual Clock has reached its due time.
  const last = await lastSeq(page)
  while ((await timer.count()) > 0) {
    expect(await current(page)).not.toBe(last)
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await expect(page.getByTestId('scene-clock')).toHaveText('100ms')
})

test('a MessageChannel message waits in the task queue with its source', async ({ page }) => {
  await runScript(
    page,
    `const channel = new MessageChannel()
channel.port1.onmessage = () => console.log('message')
channel.port2.postMessage('hi')`,
  )

  const message = page.locator('[data-testid=scene-task][data-source=port-message]')
  await stepUntilPresent(page, message)
  await expect(message).toHaveCount(1)
  await expect(message).toContainText('port msg')
})
