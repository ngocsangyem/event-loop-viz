import { test as base } from '@playwright/test'

/**
 * The app auto-plays a Trace after Run. Specs step through Traces by hand, so they start with
 * auto-play off; a spec that covers auto-play turns it back on itself.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('elv-autoplay') === null) localStorage.setItem('elv-autoplay', 'off')
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'

/**
 * Steps the replay with the arrow shortcuts, which run the same step as the Next/Prev buttons.
 * Long step loops use them because each button click waits out a tooltip and a press transition,
 * which made hundreds of clicks too slow for WebKit on CI. Focus leaves any widget first, since
 * menus, sliders and toggle groups keep the arrow keys for themselves.
 */
export async function pressStep(page: import('@playwright/test').Page, direction: 'next' | 'prev') {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press(direction === 'next' ? 'ArrowRight' : 'ArrowLeft')
}
