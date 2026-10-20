// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatConsoleLines } from '../console-lines'

describe('formatConsoleLines', () => {
  it('prints console calls by level', () => {
    expect(formatConsoleLines([{ kind: 'console', level: 'warn', text: 'hi' }])).toEqual([
      { kind: 'console', text: 'warn: hi' },
    ])
  })

  it('prints an Unsupported API exception like a Chrome Uncaught line', () => {
    expect(
      formatConsoleLines([{ kind: 'uncaught-exception', message: 'fetch is not supported in v1' }]),
    ).toEqual([
      { kind: 'error', text: 'Uncaught UnsupportedApiError: fetch is not supported in v1' },
    ])
  })

  it('prints plain exceptions and rejections with their Chrome prefixes', () => {
    const lines = formatConsoleLines([
      { kind: 'uncaught-exception', message: 'boom' },
      { kind: 'unhandled-rejection', message: 'nope' },
      { kind: 'rejection-handled', message: 'nope' },
    ])
    expect(lines.map((l) => l.text)).toEqual([
      'Uncaught boom',
      'Uncaught (in promise) nope',
      'rejectionhandled: nope',
    ])
  })
})
