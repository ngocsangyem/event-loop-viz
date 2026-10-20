// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatConsoleLines } from '../console-lines'
import type { TraceEvent } from '../../trace/trace-event'

const base = { t: 0, ref: 'HTML:test' as const, visible: true }
const ev = (seq: number, body: object) => ({ seq, ...base, ...body }) as unknown as TraceEvent

describe('formatConsoleLines', () => {
  it('prints console calls by level', () => {
    expect(formatConsoleLines([ev(0, { k: 'console', level: 'warn', text: 'hi' })])).toEqual([
      { kind: 'console', text: 'warn: hi' },
    ])
  })

  it('prints an Unsupported API exception like a Chrome Uncaught line', () => {
    const lines = formatConsoleLines([
      ev(0, {
        k: 'exception:report',
        origin: 'script',
        message: 'fetch is not supported in v1',
        unsupportedApi: 'fetch',
      }),
    ])
    expect(lines).toEqual([
      { kind: 'error', text: 'Uncaught UnsupportedApiError: fetch is not supported in v1' },
    ])
  })

  it('prints plain exceptions and rejections with their Chrome prefixes', () => {
    const lines = formatConsoleLines([
      ev(0, { k: 'exception:report', origin: 'script', message: 'boom' }),
      ev(1, { k: 'rejection:notify', pid: 'p', outcome: 'unhandled', message: 'nope' }),
      ev(2, { k: 'rejection:notify', pid: 'p', outcome: 'handled', message: 'nope' }),
      ev(3, { k: 'frame:push', frameId: 'f', label: 'x', builtin: false }),
    ])
    expect(lines.map((l) => l.text)).toEqual([
      'Uncaught boom',
      'Uncaught (in promise) nope',
      'rejectionhandled: nope',
    ])
  })
})
