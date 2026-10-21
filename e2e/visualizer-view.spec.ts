import { test, expect, pressStep } from './fixtures'

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

test('with Autostart on, a Run plays by itself and fills the panels step by step', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('elv-autoplay', 'on'))
  await page.goto('/')
  await page.getByLabel('Script').fill(`console.log('start');
setTimeout(() => console.log('timeout 1'), 0);
Promise.resolve().then(() => console.log('promise 1'));
console.log('end');`)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByTestId('panel-web-apis')).toContainText('setTimeout', { timeout: 15_000 })
  await expect(page.getByTestId('panel-microtask-queue')).toContainText("() => console.log('promise 1')", { timeout: 15_000 })
  await expect(page.getByTestId('console-panel')).toContainText('timeout 1', { timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('the call stack hides built-ins called by other built-ins', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`Promise.resolve(1)`)
  await page.getByRole('button', { name: 'Run' }).click()
  const stack = page.getByTestId('panel-call-stack')
  // ArrowRight steps one event and stops quietly at the end of the Trace. Focus leaves the Run
  // button first so no widget claims the arrow keys.
  await expect(page.getByTestId('replay-banner')).toBeVisible()
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('ArrowRight')
    await expect(stack.getByText('executorClosure')).toHaveCount(0)
  }
  // The walk really reached the end, past every frame of the Run.
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
})

test('queue rows and the running callback frame show the callback code, not a kind tag', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Script').fill(`Promise.resolve().then(() => console.log(1));
setTimeout(() => console.log(2), 10);
queueMicrotask(() => { console.log(3); queueMicrotask(() => console.log(4)) });
console.log(5);`)
  await page.getByRole('button', { name: 'Run' }).click()
  const micro = page.getByTestId('panel-microtask-queue')
  const stack = page.getByTestId('panel-call-stack')
  const chip = stack.locator('[data-chip-id]')
  let onStack = false
  for (let i = 0; i < 80 && !onStack; i++) {
    await pressStep(page, 'next')
    // Let Vue paint the new state before looking: the chip stays on the stack for few steps.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    onStack = (await chip.count()) > 0
  }
  expect(onStack).toBe(true)
  await expect(chip).toHaveText('() => console.log(1)')
  await expect(stack).not.toContainText('(anonymous)')
  await expect(micro.locator('[data-chip-id]').first()).toContainText('() => { console.log(3);')
  // A queued row is the chip alone: no kind tag next to it.
  await expect(micro.locator('li').last()).toHaveText('() => { console.log(3); queueMicrotask(() => console.log(4)) }')
})
