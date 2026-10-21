import { existsSync } from 'node:fs'
import { test, expect, pressStep } from './fixtures'
import type { Page } from '@playwright/test'
import { preferSceneView } from './reveal-panel'

// The 3D Scene is opt-in; these specs exercise it.
test.beforeEach(({ page }) => preferSceneView(page))

const NESTED = `function c() { console.log('deep') }
function b() { c() }
function a() { b() }
a()`

async function runScript(page: Page, script: string) {
  await page.goto('/')
  await page.getByLabel('Script').fill(script)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const frameLabels = (page: Page) =>
  page
    .locator('[data-testid=scene-frame]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-label')))
const current = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')
const lastSeq = (page: Page) =>
  page.locator('[data-testid=event-list] li').last().getAttribute('data-seq')

test('stepping through nested calls pushes and pops frames in the Scene', async ({ page }) => {
  await runScript(page, NESTED)

  // Collect the call stack the Scene shows at every step of the replay.
  const seen: (string | null)[][] = [await frameLabels(page)]
  const last = await lastSeq(page)
  for (let i = 0; i < 200 && (await current(page)) !== last; i++) {
    await pressStep(page, 'next')
    seen.push(await frameLabels(page))
  }

  const key = (labels: (string | null)[]) => labels.join(' > ')
  const keys = seen.map(key)
  // The Script's own frame is labelled `script`. Frames go on one by one as the calls nest ...
  const order = ['script', 'script > a', 'script > a > b', 'script > a > b > c']
  const firstSeen = order.map((stack) => keys.indexOf(stack))
  expect(firstSeen.every((index) => index >= 0)).toBe(true)
  expect(firstSeen).toEqual([...firstSeen].sort((x, y) => x - y))
  // ... the builtin console.log frame sits on top of c ...
  expect(keys.some((stack) => stack.endsWith('a > b > c > log'))).toBe(true)
  // ... and each call is popped again on the way out, until the stack is empty.
  const afterDeepest = keys.slice(keys.indexOf('script > a > b > c'))
  const popOrder = ['script > a > b', 'script > a', 'script'].map((stack) =>
    afterDeepest.lastIndexOf(stack),
  )
  expect(popOrder.every((index) => index >= 0)).toBe(true)
  expect(popOrder).toEqual([...popOrder].sort((x, y) => x - y))
  expect(keys[keys.length - 1]).toBe('')

  // The console printed by the script is shown on the Scene's screen.
  await expect(page.getByTestId('scene-console-line')).toHaveText('> deep')
})

test('the topmost frame is the one marked as running', async ({ page }) => {
  await runScript(page, NESTED)
  const last = await lastSeq(page)
  for (let i = 0; i < 200; i++) {
    const labels = await frameLabels(page)
    if (labels.length >= 3) break
    if ((await current(page)) === last) break
    await page.getByRole('button', { name: 'Next' }).click()
  }
  const top = page.locator('[data-testid=scene-frame][data-top]')
  await expect(top).toHaveCount(1)
  const labels = await frameLabels(page)
  await expect(top).toHaveAttribute('data-label', labels[labels.length - 1]!)
})

test.describe('theme', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'snapshots are recorded for Chrome only',
  )

  for (const scheme of ['light', 'dark'] as const) {
    test(`the Scene renders in the ${scheme} theme`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await runScript(page, NESTED)
      // Stop where a frame stack and a console line are both on screen.
      const last = await lastSeq(page)
      while ((await page.getByTestId('scene-console-line').count()) === 0) {
        expect(await current(page)).not.toBe(last)
        await page.getByRole('button', { name: 'Next' }).click()
      }
      const scene = page.getByTestId('scene')
      await expect(scene).toBeVisible()
      // The drawing reads the app's own tokens, so the token flips with the theme.
      const paper = await scene.evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--anatomy-paper').trim(),
      )
      // --scene-bg in docs/design/tokens.css.
      expect(paper).toBe(scheme === 'light' ? '#f1efe8' : '#141413')
      // Pixels differ per OS font stack, so baselines live under a per-platform folder and are
      // compared only where one was recorded. Elsewhere the token check above is the assertion.
      const name = `scene-${scheme}.png`
      if (!existsSync(testInfo.snapshotPath(name))) {
        testInfo.annotations.push({
          type: 'snapshot-skipped',
          description: `no ${process.platform} baseline for ${name}; record one with --update-snapshots`,
        })
        return
      }
      await expect(scene).toHaveScreenshot(name, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})
