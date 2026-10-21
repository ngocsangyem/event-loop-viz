import { test, expect } from '@playwright/test'

test('panels are the default view and name each part of the event loop', async ({ page }) => {
  await page.goto('/')
  for (const name of ['Call Stack', 'Task Queue', 'Microtask Queue', 'Web APIs', 'Event Loop', 'Console']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible()
  }
  await expect(page.getByTestId('scene')).toHaveCount(0)
})

test('stepping a Run fills the panels from the Trace', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`setTimeout(() => console.log('timer'), 10)
Promise.resolve().then(() => console.log('job'))
console.log('sync')`)
  await page.getByRole('button', { name: 'Run' }).click()
  await page.getByRole('button', { name: 'Forward one Task' }).click()
  await expect(page.getByTestId('panel-task-queue').locator('[aria-current=step]')).toContainText('Script')
  await page.getByRole('button', { name: 'Go to end' }).click()
  await expect(page.getByTestId('console-panel')).toContainText('timer')
  await expect(page.getByTestId('loop-phase')).toHaveText('Run finished')
})

test('the 3D view swaps the panels for the Scene and is remembered', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('view-3d').click()
  await expect(page.getByTestId('scene')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Call Stack', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('scene')).toBeVisible()
  await page.getByTestId('view-panels').click()
  await expect(page.getByTestId('scene')).toHaveCount(0)
})

test('arrow keys on the view switch move between views without stepping the Trace', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  const current = () =>
    page.locator('[data-testid=event-list] li[aria-current=true]').getAttribute('data-seq')
  const before = await current()
  await page.getByTestId('view-panels').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('End')
  expect(await current()).toBe(before)
})
