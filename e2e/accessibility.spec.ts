import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

const THEMES = ['light', 'dark'] as const
type Theme = (typeof THEMES)[number]

const SCRIPT = `setTimeout(() => console.log('timer'), 10)
Promise.resolve().then(() => console.log('job'))
console.log('sync')
console.error('boom')`

async function openApp(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
}

async function runScript(page: Page) {
  await page.getByLabel('Script').fill(SCRIPT)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

/** Serious and critical violations only; minor and moderate ones are advisory. */
async function seriousViolations(page: Page) {
  // The Vue devtools overlay only exists under the dev server; it is not part of the app.
  const results = await new AxeBuilder({ page }).exclude('.vue-devtools__anchor').exclude('.panel-entry-btn').analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) }))
}

for (const theme of THEMES) {
  test.describe(`axe in the ${theme} theme`, () => {
    test('editor view before a Run has no serious violations', async ({ page }) => {
      await openApp(page, theme)
      expect(await seriousViolations(page)).toEqual([])
      // Menus and popovers open one at a time; check each while it is open.
      for (const name of ['Examples', 'Advanced settings', 'Supported APIs']) {
        await page.getByRole('button', { name }).click()
        expect(await seriousViolations(page)).toEqual([])
        await page.keyboard.press('Escape')
      }
    })

    test('replay view has no serious violations', async ({ page }) => {
      await openApp(page, theme)
      await runScript(page)
      await page.getByRole('button', { name: 'Next', exact: true }).click()
      expect(await seriousViolations(page)).toEqual([])
      // The end of the Trace shows every console line, including the error line.
      await page.getByRole('button', { name: 'Go to end' }).click()
      expect(await seriousViolations(page)).toEqual([])
      await expect(page.getByTestId('console-panel').locator('li').first()).toBeVisible()
      expect(await seriousViolations(page)).toEqual([])
    })

    test('halted and error states have no serious violations', async ({ page }) => {
      await openApp(page, theme)
      await page.getByText('Advanced settings', { exact: true }).click()
      await page.getByTestId('setting-nodes').fill('50')
      await page.getByLabel('Script').fill('while (true) {}')
      await page.getByRole('button', { name: 'Run' }).click()
      await expect(page.getByTestId('halt-banner')).toBeVisible()
      expect(await seriousViolations(page)).toEqual([])

      await page.getByRole('button', { name: 'Edit (discards Trace)' }).click()
      await page.getByLabel('Script').fill('let = = 1')
      await page.getByRole('button', { name: 'Run' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      expect(await seriousViolations(page)).toEqual([])
    })
  })
}
