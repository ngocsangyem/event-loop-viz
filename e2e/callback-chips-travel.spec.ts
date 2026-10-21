import { test, expect, pressStep } from './fixtures'
import {
  MIXED_SCRIPT,
  ghostRects,
  ghosts,
  panelOfChip,
  runScript,
  stepUntilPresent,
  takeGhostSeen,
  transitioningChipRows,
  watchGhosts,
} from './chip-helpers'

const TIMER_CHIP = '() => console.log(2)'

/** Steps to the position where the timer has just become due, then back one step, and settles. */
async function stopBeforeTimerDue(page: import('@playwright/test').Page) {
  await runScript(page, MIXED_SCRIPT)
  await stepUntilPresent(page, page.getByTestId('panel-task-queue').getByText(TIMER_CHIP))
  await pressStep(page, 'prev')
  await expect(ghosts(page)).toHaveCount(0)
  await expect(page.getByTestId('panel-web-apis')).toContainText(TIMER_CHIP)
}

test('one Next at the timer-due moment flies the chip from Web APIs to the Task Queue and leaves no ghost', async ({
  page,
}) => {
  await stopBeforeTimerDue(page)
  await pressStep(page, 'next')

  // A ghost exists mid-flight and moves between two samples.
  let first: Awaited<ReturnType<typeof ghostRects>> = []
  await expect.poll(async () => (first = await ghostRects(page)).length).toBeGreaterThan(0)
  await expect
    .poll(async () => {
      const now = await ghostRects(page)
      return now.length > 0 && (now[0]!.left !== first[0]!.left || now[0]!.top !== first[0]!.top)
    })
    .toBe(true)

  // Settled: no ghost, the chip lives in the Task Queue only, and the card is gone.
  await expect(ghosts(page)).toHaveCount(0)
  await expect(page.getByTestId('panel-web-apis').getByText(TIMER_CHIP)).toHaveCount(0)
  await expect(page.getByTestId('panel-web-apis').locator('li')).toHaveCount(0)
  await expect(page.locator('[data-chip-id]', { hasText: TIMER_CHIP })).toHaveCount(1)
  expect(await panelOfChip(page, TIMER_CHIP)).toBe('panel-task-queue')
})

test('the ghost ends near the chip it lands on', async ({ page }) => {
  await stopBeforeTimerDue(page)
  await pressStep(page, 'next')
  const target = page.locator('[data-testid=panel-task-queue] [data-chip-id]', { hasText: TIMER_CHIP })
  await expect(target).toBeVisible()
  const box = (await target.boundingBox())!
  // Park the flight a millisecond before its end, so the check does not depend on frame rate.
  const parked = await page.evaluate(() => {
    const ghost = document.querySelector('.chip-ghost')
    const flight = ghost?.getAnimations().find((a) => a.effect?.getTiming().duration)
    if (!ghost || !flight) return null
    flight.pause()
    flight.currentTime = Number(flight.effect!.getTiming().duration) - 1
    const r = ghost.getBoundingClientRect()
    return { left: r.left, top: r.top }
  })
  expect(parked, 'a flight was running').not.toBeNull()
  expect(Math.abs(parked!.left - box.x)).toBeLessThan(8)
  expect(Math.abs(parked!.top - box.y)).toBeLessThan(8)
})

test('ghosts are removed at once when the next step supersedes the flight', async ({ page }) => {
  await stopBeforeTimerDue(page)
  await pressStep(page, 'next')
  await expect.poll(async () => (await ghostRects(page)).length).toBeGreaterThan(0)
  await pressStep(page, 'next')
  await expect(ghosts(page)).toHaveCount(0)
  await expect(page.locator('[data-chip-id]', { hasText: TIMER_CHIP })).toHaveCount(1)
})

test('a scrubber or event-list jump creates no ghost and rows do not fade in', async ({ page }) => {
  await runScript(page, MIXED_SCRIPT)
  await watchGhosts(page)
  await page.getByRole('button', { name: 'Go to end' }).click()
  await page.getByRole('button', { name: 'Go to start' }).click()
  const rows = page.locator('[data-testid=event-list] li[data-seq]')
  await rows.nth(Math.floor((await rows.count()) / 2)).click()
  await expect(ghosts(page)).toHaveCount(0)
  // A row that appears at once never carries the fade-in class.
  await expect(transitioningChipRows(page)).toHaveCount(0)
  expect(await takeGhostSeen(page)).toBe(false)
})

test('reduced motion never creates a ghost', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await runScript(page, MIXED_SCRIPT)
  await watchGhosts(page)
  await stepUntilPresent(page, page.getByTestId('panel-task-queue').getByText(TIMER_CHIP))
  await expect(page.getByTestId('panel-web-apis').getByText(TIMER_CHIP)).toHaveCount(0)
  expect(await takeGhostSeen(page)).toBe(false)
})

test('a microtask chip flies from the Microtask Queue to the Call Stack when its Job begins', async ({ page }) => {
  await runScript(page, MIXED_SCRIPT)
  const chip = '() => console.log(1)'
  await stepUntilPresent(page, page.getByTestId('panel-microtask-queue').getByText(chip))
  await watchGhosts(page)
  let flewIntoStack = false
  for (let i = 0; i < 30 && (await panelOfChip(page, chip)) !== 'panel-call-stack'; i++) {
    await pressStep(page, 'next')
    if ((await panelOfChip(page, chip)) === 'panel-call-stack') flewIntoStack = await takeGhostSeen(page)
    else await takeGhostSeen(page)
    await expect(ghosts(page)).toHaveCount(0)
  }
  expect(await panelOfChip(page, chip)).toBe('panel-call-stack')
  expect(flewIntoStack, 'a ghost flew on the step that pushed the frame').toBe(true)
})
