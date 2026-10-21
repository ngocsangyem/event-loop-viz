import AxeBuilder from '@axe-core/playwright'
import type { Page, Route } from '@playwright/test'
import { test, expect } from './fixtures'

const KEY = 'sk-or-test-key-123'
const MODEL_ID = 'acme/tiny-chat'
const MODELS = {
  data: [
    { id: 'acme/other', name: 'Acme Other', context_length: 8000, pricing: { prompt: '0.000001' } },
    { id: MODEL_ID, name: 'Acme Tiny', context_length: 32000, pricing: { prompt: '0' } },
  ],
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }

const sse = (...parts: string[]) =>
  `: OPENROUTER PROCESSING\n\n${parts
    .map((p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`)
    .join('')}data: [DONE]\n\n`

/** A tour answer as the system prompt asks for it, streamed in pieces that split a heading. */
const TOUR = [
  'The Script logs first, then the promise Jobs run. It starts on ', '`console.log`', ' at line 1.\n\n## #',
  '3 The Script Task starts\nLine 1 runs.\n',
  '## #9 A Job runs\nThe microtask queue drains.\n',
  '## #14 The last log\nThe Run ends.\n\n## Summary\nJobs run before the next Task.',
]

interface Mock {
  /** Parsed JSON bodies of the chat requests, in order. */
  requests: { headers: Record<string, string>; body: { model: string; stream: boolean; messages: { role: string; content: string }[] } }[]
  status: number
}

/** Answers OpenRouter from the test: a models list and a streamed completion. */
async function mockOpenRouter(page: Page): Promise<Mock> {
  const mock: Mock = { requests: [], status: 200 }
  await page.route('https://openrouter.ai/**', async (route: Route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    if (request.url().endsWith('/models')) return route.fulfill({ json: MODELS, headers: CORS })
    mock.requests.push({ headers: request.headers(), body: request.postDataJSON() })
    if (mock.status !== 200) {
      return route.fulfill({
        status: mock.status,
        headers: CORS,
        json: { error: { code: mock.status, message: 'nope' } },
      })
    }
    return route.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'text/event-stream' },
      body: sse(...TOUR),
    })
  })
  return mock
}

async function runExample(page: Page) {
  await page.goto('/')
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-await-vs-then').click()
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('event-list')).toBeVisible()
}

/** The event the replay shows, read from the event list. */
const playhead = async (page: Page) =>
  Number(await page.locator('[data-testid=event-list] [aria-current=true]').getAttribute('data-seq'))

/** Opens the panel from the launcher, fills the settings dialog and leaves the question box focused. */
async function connect(page: Page) {
  await page.getByTestId('ask-ai').click()
  const panel = page.getByTestId('ask-ai-panel')
  await expect(panel).toBeVisible()
  await expect(page.getByTestId('ask-ai-connect')).toBeFocused()
  await page.getByTestId('ask-ai-connect').click()
  await expect(page.getByTestId('ask-ai-settings-dialog')).toBeVisible()
  await expect(page.getByTestId('ask-ai-key')).toBeFocused()
  await page.getByTestId('ask-ai-key').fill(KEY)
  await page.getByTestId('ask-ai-settings').getByTestId('ask-ai-model').click()
  await page.getByTestId(`ask-ai-model-${MODEL_ID}`).click()
  await page.getByTestId('ask-ai-done').click()
  await expect(page.getByTestId('ask-ai-settings-dialog')).toHaveCount(0)
  await expect(page.getByTestId('ask-ai-input')).toBeFocused()
  return panel
}

async function seriousViolations(page: Page, selector: string) {
  const results = await new AxeBuilder({ page }).include(selector).analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))
}

test('the corner launcher opens the chat, and the key goes in through the settings dialog', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  // Axe reads colours mid-fade otherwise.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await runExample(page)
  await page.getByTestId('ask-ai').click()
  await expect(page.getByTestId('ask-ai')).toHaveAttribute('aria-expanded', 'true')
  // The panel's code loads on the first open.
  await expect(page.getByTestId('ask-ai-panel')).toBeVisible()
  expect(await seriousViolations(page, '[data-testid="ask-ai-panel"]')).toEqual([])
  await page.getByTestId('ask-ai-connect').click()
  await expect(page.getByTestId('ask-ai-settings-dialog')).toBeVisible()
  expect(await seriousViolations(page, '[data-testid="ask-ai-settings-dialog"]')).toEqual([])
  await page.keyboard.press('Escape')
  // The dialog has no trigger of its own; focus comes back into the panel.
  await expect(page.getByTestId('ask-ai-connect')).toBeFocused()
  await page.getByTestId('ask-ai').click()
  await expect(page.getByTestId('ask-ai-panel')).toBeHidden()

  const panel = await connect(page)
  await expect(page.getByTestId('ask-ai-context')).toContainText(/Whole Run · \d+ steps/)
  await panel.getByTestId('ask-ai-suggestion').first().click()
  const answer = panel.getByTestId('ask-ai-answer')
  await expect(answer).toContainText('It starts on console.log at line 1.')
  await expect(page.getByTestId('ask-ai-tour-stop')).toHaveCount(3)
  // Event numbers steer the tour but are never shown; neither is the "Summary" label.
  await expect(answer).not.toContainText('#')
  await expect(answer).not.toContainText('Summary')
  await expect(page.getByRole('status').filter({ hasText: 'The answer is ready.' })).toBeAttached()
  expect(await seriousViolations(page, '[data-testid="ask-ai-panel"]')).toEqual([])

  expect(mock.requests).toHaveLength(1)
  const { headers, body } = mock.requests[0]!
  expect(headers.authorization).toBe(`Bearer ${KEY}`)
  expect(body.model).toBe(MODEL_ID)
  expect(body.stream).toBe(true)
  expect(body.messages[0]!.content).toContain('guided tour')
  expect(body.messages[0]!.content).toContain('Answer in English.')
  const question = body.messages.at(-1)!.content
  expect(question).toContain('Question: Walk me through the whole Run')
  expect(question).toContain('Trace of the whole Run')
  expect(question).toContain("The learner's playhead is at:")
  expect(question).toContain('1| ')

  // "Remember" is off: the key is in memory only.
  const stored = await page.evaluate(() => [localStorage.getItem('elv-openrouter-key'), localStorage.getItem('elv-openrouter-model')])
  expect(stored).toEqual([null, MODEL_ID])
})

test('Next and Previous walk the tour, move the replay and win over playback', async ({ page }) => {
  await mockOpenRouter(page)
  await runExample(page)
  await connect(page)
  await page.getByTestId('ask-ai-suggestion').first().click()
  const stops = page.getByTestId('ask-ai-tour-stop')
  await expect(stops).toHaveCount(3)
  const seqOf = async (i: number) => Number(await stops.nth(i).getAttribute('data-seq'))
  const progress = page.getByTestId('ask-ai-tour-progress')
  await expect(page.getByTestId('ask-ai-answer')).toContainText('A guided tour of 3 stops')
  await expect(page.getByTestId('ask-ai-tour-start')).toContainText('Start tour')
  await expect(progress).toHaveCount(0)

  await page.locator('[data-control=play]').click()
  await expect(page.locator('[data-control=play]')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('ask-ai-tour-start').click()
  await expect(page.locator('[data-control=play]')).toHaveAttribute('aria-pressed', 'false')
  await expect(progress).toHaveText('1 / 3')
  expect(await playhead(page)).toBe(await seqOf(0))
  await expect(stops.nth(0)).toHaveAttribute('data-active', 'true')

  await page.getByTestId('ask-ai-tour-next').click()
  await expect(progress).toHaveText('2 / 3')
  expect(await playhead(page)).toBe(await seqOf(1))
  await page.getByTestId('ask-ai-tour-prev').click()
  await expect(progress).toHaveText('1 / 3')
  expect(await playhead(page)).toBe(await seqOf(0))

  // The Start button inside the answer starts the tour over from its first stop.
  await page.getByTestId('ask-ai-tour-start').click()
  await expect(progress).toHaveText('1 / 3')
  await expect(page.getByTestId('ask-ai-tour-start')).toContainText('Start over')

  // A stop in the answer is a shortcut to its event.
  await stops.nth(2).getByRole('button').click()
  await expect(progress).toHaveText('3 / 3')
  expect(await playhead(page)).toBe(await seqOf(2))
  await expect(page.getByTestId('ask-ai-tour-next')).toBeDisabled()
})

test('asking before any Run runs the Script first, so the answer can be a tour', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  await page.goto('/')
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-await-vs-then').click()
  await expect(page.getByTestId('event-list')).toHaveCount(0)
  await connect(page)
  await expect(page.getByTestId('ask-ai-context')).toContainText('No Run yet')
  await page.getByTestId('ask-ai-suggestion').first().click()
  // The Run happened: the Trace Events exist, in the Why rail the open panel stands in for.
  await expect(page.getByTestId('event-list')).toBeAttached()
  await expect(page.getByTestId('ask-ai-tour-start')).toBeVisible()
  expect(mock.requests).toHaveLength(1)
  expect(mock.requests[0]!.body.messages.at(-1)!.content).toContain('Trace of the whole Run')
})

test('minimized, the tour keeps going beside the launcher', async ({ page }) => {
  await mockOpenRouter(page)
  await runExample(page)
  await connect(page)
  await page.getByTestId('ask-ai-suggestion').first().click()
  await expect(page.getByTestId('ask-ai-tour-stop')).toHaveCount(3)
  await page.getByTestId('ask-ai-tour-start').click()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('ask-ai-panel')).toBeHidden()
  await expect(page.getByTestId('ask-ai')).toBeFocused()
  // The panel's own tour controls stay in the hidden panel; the floating ones are the visible pair.
  const tour = page.getByTestId('ask-ai-tour').filter({ visible: true })
  await expect(tour).toHaveCount(1)
  await tour.getByTestId('ask-ai-tour-next').click()
  await expect(tour.getByTestId('ask-ai-tour-progress')).toHaveText('2 / 3')
  await page.getByTestId('ask-ai').click()
  await expect(page.getByTestId('ask-ai-tour-stop').nth(1)).toHaveAttribute('data-active', 'true')
})

test('Enter sends and Shift+Enter adds a line', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  await runExample(page)
  await connect(page)
  const input = page.getByTestId('ask-ai-input')
  await input.fill('first')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('second')
  await expect(input).toHaveValue('first\nsecond')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('ask-ai-answer')).toContainText('console.log')
  expect(mock.requests[0]!.body.messages.at(-1)!.content).toContain('Question: first\nsecond')
})

test('with the UI in Vietnamese the system prompt asks for Vietnamese', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  await runExample(page)
  await page.getByTestId('locale').click()
  await page.getByRole('option', { name: 'Tiếng Việt' }).click()
  await page.getByTestId('ask-ai').click()
  await expect(page.getByRole('heading', { name: 'Hỏi AI' })).toBeVisible()
  await page.getByTestId('ask-ai-connect').click()
  await page.getByTestId('ask-ai-key').fill(KEY)
  await page.getByTestId('ask-ai-done').click()
  await page.getByTestId('ask-ai-suggestion').first().click()
  await expect(page.getByTestId('ask-ai-answer')).toBeVisible()
  await expect(page.getByTestId('ask-ai-tour-start')).toContainText('Bắt đầu tour')
  expect(mock.requests[0]!.body.messages[0]!.content).toContain('Answer in Vietnamese')
})

test('shows a friendly error with retry for a rejected key', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  mock.status = 401
  await runExample(page)
  await connect(page)
  await page.getByTestId('ask-ai-suggestion').first().click()
  await expect(page.getByTestId('ask-ai-error')).toContainText('OpenRouter rejected the API key')
  mock.status = 200
  await page.getByTestId('ask-ai-retry').click()
  await expect(page.getByTestId('ask-ai-answer')).toContainText('console.log')
  await expect(page.getByTestId('ask-ai-error')).toHaveCount(0)
  await expect(page.getByTestId('ask-ai-user-message')).toHaveCount(1)
})

/** Opens the settings dialog straight from a fresh page. */
async function openSettings(page: Page) {
  await page.goto('/')
  await page.getByTestId('ask-ai').click()
  await page.getByTestId('ask-ai-connect').click()
}

test('remember stores the key and Forget key clears it', async ({ page }) => {
  await mockOpenRouter(page)
  await openSettings(page)
  await page.getByTestId('ask-ai-key').fill(KEY)
  await page.getByTestId('ask-ai-remember').click()
  expect(await page.evaluate(() => localStorage.getItem('elv-openrouter-key'))).toBe(KEY)
  await expect(page.getByTestId('ask-ai-key')).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show key' }).click()
  await expect(page.getByTestId('ask-ai-key')).toHaveAttribute('type', 'text')
  await page.getByTestId('ask-ai-forget').click()
  expect(await page.evaluate(() => localStorage.getItem('elv-openrouter-key'))).toBeNull()
  await expect(page.getByTestId('ask-ai-key')).toHaveValue('')
})

test('lets you type a model id when the list cannot load', async ({ page }) => {
  await page.route('https://openrouter.ai/api/v1/models', (route) => route.abort())
  await openSettings(page)
  await page.getByTestId('ask-ai-key').fill(KEY)
  await page.getByTestId('ask-ai-settings').getByTestId('ask-ai-model').click()
  await expect(page.getByText('Could not load the model list')).toBeVisible()
  await page.getByLabel('Model id').fill('vendor/custom-model')
  await page.getByRole('button', { name: 'Use this id' }).click()
  await expect(page.getByTestId('ask-ai-settings').getByTestId('ask-ai-model')).toContainText('vendor/custom-model')
})
