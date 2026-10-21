// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { consoleRowsOf, formatConsoleLines } from '../console-lines'

describe('formatConsoleLines', () => {
  it('prints console calls by level', () => {
    expect(formatConsoleLines([{ kind: 'console', level: 'warn', text: 'hi' }])).toEqual([
      { kind: 'console', text: 'warn: hi' },
    ])
  })

  it('prints an Unsupported API exception like a Chrome Uncaught line', () => {
    expect(
      formatConsoleLines([
        {
          kind: 'uncaught-exception',
          message: 'fetch is not supported in v1',
          errorName: 'UnsupportedApiError',
        },
      ]),
    ).toEqual([
      { kind: 'error', text: 'Uncaught UnsupportedApiError: fetch is not supported in v1' },
    ])
  })

  it('does not prefix a Script error whose message only looks like an Unsupported API one', () => {
    expect(
      formatConsoleLines([{ kind: 'uncaught-exception', message: 'x is not supported in v1' }]),
    ).toEqual([{ kind: 'error', text: 'Uncaught x is not supported in v1' }])
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

describe('consoleRowsOf', () => {
  it('tags each console level and keeps the text free of a level prefix', () => {
    const rows = consoleRowsOf([
      { kind: 'console', level: 'log', text: 'a' },
      { kind: 'console', level: 'info', text: 'b' },
      { kind: 'console', level: 'warn', text: 'c' },
      { kind: 'console', level: 'error', text: 'd' },
    ])
    expect(rows.map((r) => [r.tag, r.tone, r.text, r.ruled])).toEqual([
      ['LOG', 'log', 'a', false],
      ['INF', 'info', 'b', false],
      ['WRN', 'warn', 'c', false],
      ['ERR', 'error', 'd', false],
    ])
  })

  it('marks uncaught exceptions and unhandled rejections with their prefix and an error rule', () => {
    const rows = consoleRowsOf([
      { kind: 'uncaught-exception', message: 'boom', errorName: 'UnsupportedApiError' },
      { kind: 'unhandled-rejection', message: 'nope' },
    ])
    expect(rows).toMatchObject([
      { tag: 'ERR', prefix: 'uncaught', ruled: true, text: 'UnsupportedApiError: boom' },
      { tag: 'REJ', prefix: 'unhandled-rejection', ruled: true, text: 'nope' },
    ])
  })

  it('collapses identical consecutive lines into a count and keeps the latest meta', () => {
    const same = { kind: 'console', level: 'log', text: 'tick' } as const
    const rows = consoleRowsOf([same, same, { kind: 'console', level: 'warn', text: 'tick' }, same], ['L1', 'L2', 'L3', 'L4'])
    expect(rows.map((r) => [r.tag, r.count, r.meta])).toEqual([
      ['LOG', 2, 'L2'],
      ['WRN', 1, 'L3'],
      ['LOG', 1, 'L4'],
    ])
  })

  it('leaves meta null when the Trace gave none', () => {
    expect(consoleRowsOf([{ kind: 'console', level: 'log', text: 'x' }])[0]!.meta).toBeNull()
  })
})
