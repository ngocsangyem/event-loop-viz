import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { preferSceneView } from './reveal-panel'

// The 3D Scene is opt-in; these specs exercise it.
test.beforeEach(({ page }) => preferSceneView(page))

const SCRIPT = `setTimeout(() => console.log('timer'), 10)
Promise.resolve().then(() => console.log('a')).then(() => console.log('b'))
async function f() { await null; console.log('after await') }
f()
console.log('sync')`

async function runScript(page: Page) {
  await page.clock.install()
  await page.goto('/')
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const currentSeq = async (page: Page) =>
  Number(
    await page
      .locator('[data-testid=event-list] li[aria-current=true]')
      .getAttribute('data-seq'),
  )

/** Resolves once nothing inside the Scene is animating. */
const settle = (page: Page) =>
  page.waitForFunction(
    () => document.querySelector('[data-testid=scene]')!.getAnimations({ subtree: true }).length === 0,
  )

const sceneDom = async (page: Page) => {
  await settle(page)
  return page.getByTestId('scene').innerHTML()
}

const goToStart = (page: Page) => page.getByRole('button', { name: 'Go to start' }).click()

/**
 * Clicks Next and reports how many animations the Scene runs two frames later, i.e. while
 * a transition that the step started is still under way.
 */
const stepAndCountAnimations = (page: Page) =>
  page.getByRole('button', { name: 'Next' }).evaluate(
    (button) =>
      new Promise<number>((resolve) => {
        ;(button as HTMLButtonElement).click()
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            resolve(
              document.querySelector('[data-testid=scene]')!.getAnimations({ subtree: true })
                .length,
            ),
          ),
        )
      }),
  )

async function countsThroughTheReplay(page: Page) {
  const last = Number(
    await page.locator('[data-testid=event-list] li').last().getAttribute('data-seq'),
  )
  const counts: number[] = []
  for (let i = 0; i < 300 && (await currentSeq(page)) !== last; i++) {
    counts.push(await stepAndCountAnimations(page))
  }
  return counts
}

test('the same position gives an identical Scene whether played, stepped, scrubbed or stepped back', async ({
  page,
}) => {
  await runScript(page)

  // A position in the middle of the Run where Jobs, a Task, a timer and a promise are live.
  const marker = page.locator('[data-testid=scrubber] [data-family=job]').nth(1)
  const target = Number(await marker.getAttribute('data-seq'))

  // Played: the clock drives the playback timer one event per 500 ms at 1x.
  await page.getByRole('button', { name: 'Play' }).click()
  for (let i = 0; i < 400 && (await currentSeq(page)) < target; i++) {
    await page.clock.runFor(500)
  }
  await page.getByRole('button', { name: 'Pause' }).click()
  expect(await currentSeq(page)).toBe(target)
  const played = await sceneDom(page)
  expect(played).toContain('data-testid="scene-job"')

  // Stepped one event at a time.
  await goToStart(page)
  for (let i = 0; i < 400 && (await currentSeq(page)) < target; i++) {
    await page.getByRole('button', { name: 'Next' }).click()
  }
  expect(await currentSeq(page)).toBe(target)
  expect(await sceneDom(page)).toBe(played)

  // Scrubbed: jumping straight to the marker.
  await goToStart(page)
  await marker.click()
  expect(await currentSeq(page)).toBe(target)
  expect(await sceneDom(page)).toBe(played)

  // Stepped back from the end of the Run.
  await page.locator('body').click()
  await page.keyboard.press('End')
  for (let i = 0; i < 400 && (await currentSeq(page)) > target; i++) {
    await page.getByRole('button', { name: 'Prev' }).click()
  }
  expect(await currentSeq(page)).toBe(target)
  expect(await sceneDom(page)).toBe(played)
})

test('items animate between parts when the user steps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await runScript(page)
  const counts = await countsThroughTheReplay(page)
  expect(Math.max(...counts)).toBeGreaterThan(0)
  await settle(page)
})

test('with reduced motion the Scene changes state without any animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await runScript(page)
  const counts = await countsThroughTheReplay(page)
  expect(counts.length).toBeGreaterThan(5)
  expect(counts.every((count) => count === 0)).toBe(true)
  // Neither CSS nor SVG animation elements are left in the drawing.
  await expect(page.locator('[data-testid=scene] animate, [data-testid=scene] animateTransform')).toHaveCount(0)
  expect(await page.getByTestId('scene').evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0)
})
