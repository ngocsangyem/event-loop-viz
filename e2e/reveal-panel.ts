import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Scrolls a labelled panel of the visualizer into view; Console and Events are always shown. */
export async function revealPanel(page: Page, name: 'Console' | 'Trace events') {
  const region = page.getByRole('region', { name, exact: true }).first()
  await region.scrollIntoViewIfNeeded()
  await expect(region).toBeVisible()
}

/** Makes the next page load open in the 3D Scene view instead of the default panels. */
export async function preferSceneView(page: Page) {
  await page.addInitScript(() => localStorage.setItem('elv-view', '3d'))
}
