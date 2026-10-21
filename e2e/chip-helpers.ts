import { expect, pressStep } from './fixtures'
import type { Locator, Page } from '@playwright/test'

/** The script from the bug report: a timer, two microtasks and a sync log. */
export const MIXED_SCRIPT = `Promise.resolve()
  .then(() => console.log(1));

setTimeout(() => console.log(2), 10);

queueMicrotask(() => {
  console.log(3)
  queueMicrotask(() => console.log(4))
});

console.log(5);`

export async function runScript(page: Page, script: string) {
  await page.goto('/')
  await page.getByLabel('Script').fill(script)
  // The shortcut works in every UI language; the Run button's name is translated.
  await page.getByLabel('Script').press('ControlOrMeta+Enter')
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

export const ghosts = (page: Page) => page.locator('.chip-ghost')

export const currentSeq = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=step]').getAttribute('data-seq')

const lastSeq = (page: Page) => page.locator('[data-testid=event-list] li[data-seq]').last().getAttribute('data-seq')

/** Steps forward until `locator` matches something; fails at the end of the Trace. */
export async function stepUntilPresent(page: Page, locator: Locator, maxSteps = 400) {
  const last = await lastSeq(page)
  for (let i = 0; i < maxSteps; i++) {
    if ((await locator.count()) > 0) return
    expect(await currentSeq(page), 'reached the end without seeing it').not.toBe(last)
    await pressStep(page, 'next')
  }
  throw new Error(`not seen within ${maxSteps} steps`)
}

/** The testid of the panel list a chip sits in right now, or null when it is nowhere. A row still fading out is not a place. */
export function panelOfChip(page: Page, chipText: string): Promise<string | null> {
  return page.evaluate((text) => {
    const chip = [...document.querySelectorAll('[data-chip-id]')].find(
      (el) => el.textContent === text && !el.closest('.queue-item-leave-active'),
    )
    return chip?.closest('[data-testid^=panel-]')?.getAttribute('data-testid') ?? null
  }, chipText)
}

/** Every `.chip-ghost` rectangle right now. */
export function ghostRects(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.chip-ghost')].map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    }),
  )
}

/** Starts recording whether a `.chip-ghost` ever enters the DOM; short flights are easy to miss by polling. */
export async function watchGhosts(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __ghostSeen: boolean }
    w.__ghostSeen = false
    new MutationObserver(() => {
      if (document.querySelector('.chip-ghost')) w.__ghostSeen = true
    }).observe(document.body, { childList: true, subtree: true })
  })
}

/** Whether a ghost appeared since the last call; reading resets the flag. */
export const takeGhostSeen = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __ghostSeen: boolean }
    const seen = w.__ghostSeen
    w.__ghostSeen = false
    return seen
  })

/** Rows in the four chip panels that are playing an enter or leave transition. */
export const transitioningChipRows = (page: Page) =>
  page.locator(
    ['web-apis', 'task-queue', 'microtask-queue', 'call-stack']
      .map((p) => `[data-testid=panel-${p}] > [class*=-enter-], [data-testid=panel-${p}] > [class*=-leave-]`)
      .join(', '),
  )

/** Steps once and waits two frames, so the panels and any flight have been patched when it returns. */
export async function stepAndSettle(page: Page, direction: 'next' | 'prev' = 'next') {
  await pressStep(page, direction)
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}
