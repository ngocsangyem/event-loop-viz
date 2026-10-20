import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Selects a tab of the bottom panel; only the selected tab's panel is visible. */
export async function openBottomTab(page: Page, name: 'Console' | 'Events') {
  await page.getByRole('tab', { name, exact: true }).click()
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true')
}
