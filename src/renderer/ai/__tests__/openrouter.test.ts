import { beforeEach, describe, expect, it, vi } from 'vitest'
import { streamChat } from '../openrouter-client'
import { AskAiError, classifyFailure } from '../openrouter-error'
import { loadModels, parseModels, pickDefaultModel, resetModelsCache } from '../openrouter-models'

function streamResponse(chunks: string[], init: ResponseInit = {}): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
    { status: 200, ...init },
  )
}

const call = (fetchImpl: typeof fetch, onDelta = vi.fn<(text: string) => void>()) =>
  streamChat({
    apiKey: 'sk-or-secret',
    model: 'm/x',
    messages: [{ role: 'user', content: 'hi' }],
    signal: new AbortController().signal,
    onDelta,
    fetchImpl,
  })

describe('streamChat', () => {
  it('sends the key only in the Authorization header and streams the deltas', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      streamResponse([
        ': OPENROUTER PROCESSING\n\n',
        'data: {"choices":[{"delta":{"content":"He"}}]}\n\ndata: {"choices":[{"delta":{"conte',
        'nt":"llo"}}]}\n\ndata: [DONE]\n\n',
      ]),
    )
    const onDelta = vi.fn<(text: string) => void>()
    await expect(call(fetchImpl, onDelta)).resolves.toBe('Hello')
    expect(onDelta.mock.calls.map((c) => c[0])).toEqual(['He', 'llo'])
    const [url, rawInit] = fetchImpl.mock.calls[0]!
    const init = rawInit as { headers: Record<string, string>; body: string }
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(String(url)).not.toContain('sk-or-secret')
    expect(init.headers.Authorization).toBe('Bearer sk-or-secret')
    expect(init.headers['X-Title']).toBe('Event Loop Visualizer')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'm/x', stream: true })
  })

  it.each([
    [401, 'invalid-key'],
    [402, 'no-credits'],
    [429, 'rate-limited'],
    [404, 'model-not-found'],
    [500, 'unknown'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"error":{"message":"nope"}}', { status }))
    await expect(call(fetchImpl)).rejects.toMatchObject({ kind, detail: 'nope' })
  })

  it('maps a rejected fetch to a network error', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(call(fetchImpl)).rejects.toMatchObject({ kind: 'network' })
  })

  it('throws when the stream carries an error object', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      streamResponse(['data: {"error":{"code":402,"message":"credits"}}\n\n']),
    )
    await expect(call(fetchImpl)).rejects.toBeInstanceOf(AskAiError)
  })

  it('fails on a stream with no text', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(streamResponse(['data: [DONE]\n\n']))
    await expect(call(fetchImpl)).rejects.toMatchObject({ kind: 'empty' })
  })
})

describe('classifyFailure', () => {
  it('treats a 400 about the model as model-not-found', () => {
    expect(classifyFailure(400, 'x is not a valid model ID')).toBe('model-not-found')
    expect(classifyFailure(400, 'bad request')).toBe('unknown')
  })
})

describe('models', () => {
  beforeEach(resetModelsCache)

  const payload = {
    data: [
      { id: 'a/free', name: 'A Free', context_length: 32000, pricing: { prompt: '0' }, architecture: { output_modalities: ['text'] } },
      { id: 'b/paid', context_length: 8000, pricing: { prompt: '0.000001' } },
      { id: 'c/image', name: 'Image', pricing: { prompt: '0' }, architecture: { output_modalities: ['image'] } },
      { name: 'no id' },
    ],
  }

  it('parses name, context and free flag and drops non-text models', () => {
    expect(parseModels(payload)).toEqual([
      { id: 'a/free', name: 'A Free', contextLength: 32000, free: true },
      { id: 'b/paid', name: 'b/paid', contextLength: 8000, free: false },
    ])
    expect(parseModels(null)).toEqual([])
  })

  it('prefers a curated model, else the first entry', () => {
    const models = parseModels(payload)
    expect(pickDefaultModel(models)).toBe('a/free')
    const withPreferred = [...models, { id: 'deepseek/deepseek-v4-flash', name: 'D', contextLength: 1, free: false }]
    expect(pickDefaultModel(withPreferred)).toBe('deepseek/deepseek-v4-flash')
    expect(pickDefaultModel([])).toBeUndefined()
  })

  it('caches a successful load and retries after a failure', async () => {
    const ok = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(Response.json(payload)))
    await loadModels(ok)
    await loadModels(ok)
    expect(ok).toHaveBeenCalledTimes(1)

    resetModelsCache()
    const bad = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 500 }))
    await expect(loadModels(bad)).rejects.toThrow('models 500')
    await expect(loadModels(ok)).resolves.toHaveLength(2)
  })
})
