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
