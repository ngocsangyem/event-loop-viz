import { AskAiError, classifyFailure, readErrorMessage } from './openrouter-error'
import { createSseParser } from './sse-parser'

const API = 'https://openrouter.ai/api/v1'
/** Caps the cost of one answer; explanations are short. */
const MAX_OUTPUT_TOKENS = 1200

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamChatOptions {
  apiKey: string
  model: string
  messages: readonly ChatMessage[]
  signal: AbortSignal
  onDelta: (text: string) => void
  /** Swappable in tests. */
  fetchImpl?: typeof fetch
}

/**
 * Streams one chat completion straight from the browser to OpenRouter and returns the full
 * text. Throws `AskAiError` for provider and network failures; an aborted request rethrows the
 * browser's AbortError so the caller can tell Stop from a failure. The key only ever travels in
 * the Authorization header.
 */
export async function streamChat(options: StreamChatOptions): Promise<string> {
  const { apiKey, model, messages, signal, onDelta, fetchImpl = fetch } = options
  let response: Response
  try {
    response = await fetchImpl(`${API}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Event Loop Visualizer',
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: MAX_OUTPUT_TOKENS }),
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new AskAiError('network')
  }

  if (!response.ok) {
    const message = readErrorMessage(await response.text().catch(() => ''))
    throw new AskAiError(classifyFailure(response.status, message), message)
  }
  if (!response.body) throw new AskAiError('network')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser()
  let answer = ''
  let done = false

  function handle(text: string, flush: boolean) {
    for (const event of flush ? parser.flush() : parser.push(text)) {
      if (event.type === 'delta') {
        answer += event.text
        onDelta(event.text)
      } else if (event.type === 'done') {
        done = true
      } else {
        throw new AskAiError(classifyFailure(event.code ?? 0, event.message), event.message)
      }
    }
  }

  try {
    while (!done) {
      const { value, done: finished } = await reader.read()
      if (finished) break
      handle(decoder.decode(value, { stream: true }), false)
    }
    if (!done) handle('', true)
  } catch (error) {
    if (error instanceof AskAiError || signal.aborted) throw error
    throw new AskAiError('network')
  } finally {
    void reader.cancel().catch(() => undefined)
  }
  if (answer === '') throw new AskAiError('empty')
  return answer
}
