import { describe, expect, it } from 'vitest'
import { createSseParser } from '../sse-parser'
import type { SseEvent } from '../sse-parser'

const delta = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`

function run(chunks: string[]): SseEvent[] {
  const parser = createSseParser()
  return [...chunks.flatMap((c) => parser.push(c)), ...parser.flush()]
}

describe('createSseParser', () => {
  it('emits one delta per data line', () => {
    expect(run([delta('Hel'), delta('lo')])).toEqual([
      { type: 'delta', text: 'Hel' },
      { type: 'delta', text: 'lo' },
    ])
  })

  it('handles chunks that split a line mid-way, including inside the JSON', () => {
    const whole = delta('split me')
    for (let cut = 1; cut < whole.length; cut++) {
      expect(run([whole.slice(0, cut), whole.slice(cut)])).toEqual([{ type: 'delta', text: 'split me' }])
    }
  })

  it('ignores comment lines such as OPENROUTER PROCESSING', () => {
    expect(run([': OPENROUTER PROCESSING\n\n', delta('x'), ': keep-alive\n'])).toEqual([
      { type: 'delta', text: 'x' },
    ])
  })

  it('stops at [DONE] and drops anything after it', () => {
    expect(run([delta('a'), 'data: [DONE]\n\n', delta('late')])).toEqual([
      { type: 'delta', text: 'a' },
      { type: 'done' },
    ])
  })

  it('reads CRLF line endings', () => {
    expect(run(['data: {"choices":[{"delta":{"content":"hi"}}]}\r\n\r\n'])).toEqual([
      { type: 'delta', text: 'hi' },
    ])
  })

  it('skips empty deltas, role-only deltas and malformed JSON', () => {
    expect(
      run([
        'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}\n',
        'data: {not json\n',
        'data: []\n',
        delta('ok'),
      ]),
    ).toEqual([{ type: 'delta', text: 'ok' }])
  })

  it('reports an error object sent in the stream', () => {
    expect(run(['data: {"error":{"code":429,"message":"slow down"}}\n\n'])).toEqual([
      { type: 'error', message: 'slow down', code: 429 },
    ])
  })

  it('flushes a final line that has no trailing newline', () => {
    expect(run(['data: {"choices":[{"delta":{"content":"tail"}}]}'])).toEqual([
      { type: 'delta', text: 'tail' },
    ])
  })
})
