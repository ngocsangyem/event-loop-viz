import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function runScript(page: Page, script: string) {
  await page.goto('/')
  await page.getByLabel('Script').fill(script)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
}

const consoleLines = (page: Page) => page.getByTestId('console-panel').locator('li')
const currentSeq = (page: Page) =>
  page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')

async function goToEnd(page: Page) {
  await page.getByRole('button', { name: 'Go to end' }).click()
}

test('the editor shows line numbers and syntax-highlighted tokens', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`const answer = 42\nconsole.log('hi', answer)`)
  await expect(page.locator('.cm-lineNumbers .cm-gutterElement', { hasText: '2' })).toBeVisible()
  // Highlighting wraps tokens in styled spans; plain text would leave the line without any.
  await expect(page.locator('.cm-line').first().locator('span').first()).toBeVisible()
})

test('after an Unsupported API throws, the rest of the Script still runs', async ({ page }) => {
  await runScript(
    page,
    `setTimeout(() => console.log('still runs'), 0)\nfetch('/x')\nconsole.log('unreached')`,
  )
  await goToEnd(page)
  await expect(page.getByTestId('console-panel')).toContainText(
    'Uncaught UnsupportedApiError: fetch is not supported in v1',
  )
  await expect(page.getByTestId('console-panel')).toContainText('log: still runs')
  await expect(page.getByTestId('console-panel')).not.toContainText('unreached')
})

test('the console shows unhandled rejections as Uncaught (in promise) lines', async ({ page }) => {
  await runScript(page, `Promise.reject(new Error('boom'))`)
  await goToEnd(page)
  await expect(page.getByTestId('console-panel')).toContainText('Uncaught (in promise) boom')
})

test('console values use the canonical text format', async ({ page }) => {
  await runScript(page, `console.log(1, 'a', null, undefined, true)`)
  await goToEnd(page)
  await expect(consoleLines(page)).toHaveText(['log: 1 a null undefined true'])
})

test('Math.random is seeded, so re-running the same Script repeats its output', async ({
  page,
}) => {
  await runScript(page, `console.log(Math.random(), Math.random())`)
  await goToEnd(page)
  const first = await consoleLines(page).allInnerTexts()
  expect(first).toHaveLength(1)

  await page.getByRole('button', { name: 'Edit (discards Trace)' }).click()
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  await goToEnd(page)
  await expect(consoleLines(page)).toHaveText(first)
})

test.describe('infinite loop Halt', () => {
  async function haltedRun(page: Page) {
    await page.goto('/')
    await page.getByText('Advanced settings', { exact: true }).click()
    await page.getByTestId('setting-nodes').fill('5000')
    await page.getByLabel('Script').fill('while (true) {}')
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByTestId('halt-banner')).toBeVisible()
  }

  test('the same Script halts at the same point every time', async ({ page }) => {
    await haltedRun(page)
    await goToEnd(page)
    const firstEnd = await currentSeq(page)

    await page.getByRole('button', { name: 'Edit (discards Trace)' }).click()
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByTestId('replay-banner')).toBeVisible()
    await goToEnd(page)
    expect(await currentSeq(page)).toBe(firstEnd)
  })

  test('the partial Trace of a halted Run can be replayed backward and forward', async ({
    page,
  }) => {
    await haltedRun(page)
    await goToEnd(page)
    const end = await currentSeq(page)
    await page.getByRole('button', { name: 'Prev' }).click()
    expect(await currentSeq(page)).not.toBe(end)
    await page.getByRole('button', { name: 'Next' }).click()
    expect(await currentSeq(page)).toBe(end)
    await expect(page.getByTestId('halt-banner')).toBeVisible()
  })
})

test.describe('timing-sensitive badge', () => {
  test('a Run whose timer is due as compute ends is flagged', async ({ page }) => {
    await runScript(
      page,
      `setTimeout(() => console.log('t'), 5)\nconst s = Date.now()\nwhile (Date.now() - s < 5) {}`,
    )
    await expect(page.getByTestId('timing-badge')).toContainText('Timing-sensitive')
  })

  test('an ordinary Run has no badge', async ({ page }) => {
    await runScript(page, `setTimeout(() => console.log('t'), 1000)\nconsole.log('sync')`)
    await expect(page.getByTestId('timing-badge')).toHaveCount(0)
  })
})
