/** What one OpenRouter stream line means for the answer being built. */
export type SseEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string; code?: number }

export interface SseParser {
  /** Feed the next chunk of decoded text; chunks may split a line anywhere. */
  push(chunk: string): SseEvent[]
  /** Parse whatever is left once the stream ends without a trailing newline. */
  flush(): SseEvent[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** One `data:` payload to its events. Unparseable payloads are skipped: the stream carries on. */
function parsePayload(payload: string): SseEvent[] {
  if (payload === '[DONE]') return [{ type: 'done' }]
  let json: unknown
  try {
    json = JSON.parse(payload)
  } catch {
    return []
  }
  if (!isRecord(json)) return []
  const events: SseEvent[] = []
  const error = json.error
  if (isRecord(error)) {
    events.push({
      type: 'error',
      message: typeof error.message === 'string' ? error.message : 'Unknown error',
      code: typeof error.code === 'number' ? error.code : undefined,
    })
    return events
  }
  const choices = json.choices
  const first = Array.isArray(choices) ? (choices[0] as unknown) : undefined
  const delta = isRecord(first) ? first.delta : undefined
  const content = isRecord(delta) ? delta.content : undefined
  if (typeof content === 'string' && content !== '') events.push({ type: 'delta', text: content })
  return events
}

function parseLine(line: string): SseEvent[] {
  // Blank lines end an event; lines starting with ":" are comments (": OPENROUTER PROCESSING").
  if (line === '' || line.startsWith(':')) return []
  if (!line.startsWith('data:')) return []
  return parsePayload(line.slice(5).trim())
}

/** Incremental parser for the `text/event-stream` body of a streamed chat completion. */
export function createSseParser(): SseParser {
  let buffer = ''
  let finished = false

  function take(lines: string[]): SseEvent[] {
    const events: SseEvent[] = []
    for (const line of lines) {
      if (finished) break
      for (const event of parseLine(line.replace(/\r$/, ''))) {
        events.push(event)
        if (event.type === 'done') finished = true
      }
    }
    return events
  }

  return {
    push(chunk) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      return take(lines)
    },
    flush() {
      const rest = buffer
      buffer = ''
      return take([rest])
    },
  }
}
