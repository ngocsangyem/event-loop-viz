import AxeBuilder from '@axe-core/playwright'
import type { Page, Route } from '@playwright/test'
import { test, expect, pressStep } from './fixtures'

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
      body: sse('The Script starts on ', '`console.log`', ' at line 1.'),
    })
  })
  return mock
}

async function runExampleAndStep(page: Page) {
  await page.goto('/')
  await page.getByText('Examples', { exact: true }).click()
  await page.getByTestId('example-await-vs-then').click()
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('event-list')).toBeVisible()
  await pressStep(page, 'next')
  await pressStep(page, 'next')
}

/** Opens the sheet, types the key and picks the mock model; leaves the chat showing. */
async function connect(page: Page) {
  await page.getByTestId('ask-ai').click()
  const sheet = page.getByTestId('ask-ai-sheet')
  await expect(sheet).toBeVisible()
  await expect(page.getByTestId('ask-ai-key')).toBeFocused()
  await page.getByTestId('ask-ai-key').fill(KEY)
  await page.getByTestId('ask-ai-model').click()
  await page.getByTestId(`ask-ai-model-${MODEL_ID}`).click()
  await page.getByTestId('ask-ai-done').click()
  await expect(page.getByTestId('ask-ai-input')).toBeFocused()
  return sheet
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).include('[data-testid="ask-ai-sheet"]').analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))
}

test('asks a suggested question and streams the answer with the current step', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  // Axe reads colours mid-fade otherwise.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await runExampleAndStep(page)
  await page.getByTestId('ask-ai').click()
  await expect(page.getByTestId('ask-ai-settings')).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
  await page.keyboard.press('Escape')
  const sheet = await connect(page)

  const chip = page.getByTestId('ask-ai-context')
  await expect(chip).toContainText(/Step #\d+ · /)
  const seq = /#(\d+)/.exec((await chip.textContent()) ?? '')?.[1]

  await sheet.getByTestId('ask-ai-suggestion').first().click()
  const answer = sheet.getByTestId('ask-ai-answer')
  await expect(answer).toContainText('The Script starts on console.log at line 1.')
  await expect(answer.locator('code')).toHaveText('console.log')
  await expect(page.getByRole('status').filter({ hasText: 'The answer is ready.' })).toBeAttached()
  expect(await seriousViolations(page)).toEqual([])

  expect(mock.requests).toHaveLength(1)
  const { headers, body } = mock.requests[0]!
  expect(headers.authorization).toBe(`Bearer ${KEY}`)
  expect(body.model).toBe(MODEL_ID)
  expect(body.stream).toBe(true)
  expect(body.messages[0]).toMatchObject({ role: 'system' })
  expect(body.messages[0]!.content).toContain('patient JavaScript teacher')
  expect(body.messages[0]!.content).toContain('Answer in English.')
  const question = body.messages.at(-1)!.content
  expect(question).toContain('Question: Explain this step')
  expect(question).toContain('Current step:')
  expect(question).toContain(`#${seq} `)
  expect(question).toContain('1| ')

  // "Remember" is off: the key is in memory only.
  const stored = await page.evaluate(() => [localStorage.getItem('elv-openrouter-key'), localStorage.getItem('elv-openrouter-model')])
  expect(stored).toEqual([null, MODEL_ID])
})

test('Enter sends and Shift+Enter adds a line', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  await runExampleAndStep(page)
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
  await runExampleAndStep(page)
  await page.getByTestId('locale').click()
  await page.getByRole('option', { name: 'Tiếng Việt' }).click()
  await page.getByTestId('ask-ai').click()
  await expect(page.getByRole('heading', { name: 'Hỏi AI' })).toBeVisible()
  await page.getByTestId('ask-ai-key').fill(KEY)
  await page.getByTestId('ask-ai-done').click()
  await page.getByTestId('ask-ai-suggestion').first().click()
  await expect(page.getByTestId('ask-ai-answer')).toBeVisible()
  expect(mock.requests[0]!.body.messages[0]!.content).toContain('Answer in Vietnamese')
})

test('shows a friendly error with retry for a rejected key', async ({ page }) => {
  const mock = await mockOpenRouter(page)
  mock.status = 401
  await runExampleAndStep(page)
  await connect(page)
  await page.getByTestId('ask-ai-suggestion').first().click()
  await expect(page.getByTestId('ask-ai-error')).toContainText('OpenRouter rejected the API key')
  mock.status = 200
  await page.getByTestId('ask-ai-retry').click()
  await expect(page.getByTestId('ask-ai-answer')).toContainText('console.log')
  await expect(page.getByTestId('ask-ai-error')).toHaveCount(0)
  await expect(page.getByTestId('ask-ai-user-message')).toHaveCount(1)
})

test('remember stores the key and Forget key clears it', async ({ page }) => {
  await mockOpenRouter(page)
  await page.goto('/')
  await page.getByTestId('ask-ai').click()
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
  await page.goto('/')
  await page.getByTestId('ask-ai').click()
  await page.getByTestId('ask-ai-key').fill(KEY)
  await page.getByTestId('ask-ai-model').click()
  await expect(page.getByText('Could not load the model list')).toBeVisible()
  await page.getByLabel('Model id').fill('vendor/custom-model')
  await page.getByRole('button', { name: 'Use this id' }).click()
  await expect(page.getByTestId('ask-ai-model')).toContainText('vendor/custom-model')
})
