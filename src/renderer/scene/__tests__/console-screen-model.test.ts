import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import { consoleScreenOf } from '../console-screen-model'

const stateWith = (consoleEntries: ReplayState['console']): ReplayState => ({
  ...createInitialState(),
  console: consoleEntries,
})

describe('consoleScreenOf', () => {
  it('is empty before anything was printed', () => {
    expect(consoleScreenOf(createInitialState(), { rows: 5, columns: 30 }).rows).toEqual([])
  })

  it('prefixes each console level and marks only errors for emphasis', () => {
    const { rows } = consoleScreenOf(
      stateWith([
        { kind: 'console', level: 'log', text: 'sync' },
        { kind: 'console', level: 'info', text: 'fyi' },
        { kind: 'console', level: 'warn', text: 'careful' },
        { kind: 'console', level: 'error', text: 'bad' },
      ]),
      { rows: 8, columns: 30 },
    )
    expect(rows.map((row) => row.text)).toEqual(['> sync', 'i fyi', '! careful', 'x bad'])
    expect(rows.map((row) => row.tone)).toEqual(['normal', 'normal', 'normal', 'error'])
  })

  it('prints exceptions and rejections the way a browser console would', () => {
    const { rows } = consoleScreenOf(
      stateWith([
        { kind: 'uncaught-exception', message: 'boom' },
        { kind: 'unhandled-rejection', message: 'nope' },
        { kind: 'rejection-handled', message: 'nope' },
      ]),
      { rows: 8, columns: 40 },
    )
    expect(rows.map((row) => [row.text, row.tone])).toEqual([
      ['Uncaught boom', 'error'],
      ['Uncaught (in promise) nope', 'error'],
      ['rejectionhandled: nope', 'normal'],
    ])
  })

  it('scrolls: only the newest rows that fit stay on the screen', () => {
    const entries = ['a', 'b', 'c', 'd'].map((text) => ({
      kind: 'console' as const,
      level: 'log' as const,
      text,
    }))
    const { rows } = consoleScreenOf(stateWith(entries), { rows: 2, columns: 30 })
    expect(rows.map((row) => row.text)).toEqual(['> c', '> d'])
  })

  it('splits multi-line text into rows and clips long rows with an ellipsis', () => {
    const { rows } = consoleScreenOf(
      stateWith([
        { kind: 'console', level: 'log', text: 'one\ntwo' },
        { kind: 'console', level: 'log', text: '0123456789' },
      ]),
      { rows: 8, columns: 8 },
    )
    expect(rows.map((row) => row.text)).toEqual(['> one', '> two', '> 01234…'])
  })

  it('counts every printed entry, including those scrolled off', () => {
    const entries = [1, 2, 3].map((n) => ({
      kind: 'console' as const,
      level: 'log' as const,
      text: String(n),
    }))
    expect(consoleScreenOf(stateWith(entries), { rows: 1, columns: 9 }).printed).toBe(3)
  })
})
