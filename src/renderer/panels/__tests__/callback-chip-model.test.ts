import { describe, expect, it } from 'vitest'
import { chipsOf, chipText, MAX_CHIP_CHARS } from '../callback-chip-model'
import { MAX_WEB_API_CARDS } from '../web-api-card-model'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import type { ChipLabels } from '../callback-chip-model'
import type { SourceLocation } from '../../../trace/trace-event'

const labels: ChipLabels = {
  awaitResume: (fn) => `${fn} after await`,
  anonymous: '(anonymous)',
  line: (n) => `line ${n}`,
  taskSource: (s) => s,
  jobKind: (k) => k,
}
const loc = (source: string, text: string): SourceLocation => {
  const start = source.indexOf(text)
  return { start, end: start + text.length, line: 1, column: start + 1 }
}

describe('chipText', () => {
  it('collapses whitespace in a function and cuts it at the limit', () => {
    const source = `x(() => {\n   console.log(1)\n})`
    const info = { kind: 'function' as const, loc: loc(source, '() => {\n   console.log(1)\n}') }
    expect(chipText(info, source, labels)?.text).toBe('() => { console.log(1) }')
    const long = `f(${'a'.repeat(300)})`
    const cutText = chipText({ kind: 'function', loc: loc(long, long) }, long, labels)!
    expect(cutText.text).toHaveLength(MAX_CHIP_CHARS)
    expect(cutText.text.endsWith('…')).toBe(true)
    expect(cutText.full.length).toBeGreaterThan(MAX_CHIP_CHARS)
  })
  it('prefixes console methods, names await continuations, and has nothing for empty info', () => {
    expect(chipText({ kind: 'builtin', name: 'log' }, '', labels)?.text).toBe('console.log')
    expect(chipText({ kind: 'builtin', name: 'max' }, '', labels)?.text).toBe('max')
    expect(chipText({ kind: 'await', name: 'f', loc: { start: 0, end: 1, line: 3, column: 1 } }, '', labels)).toEqual({
      text: 'f after await',
      full: 'f after await (line 3)',
    })
    expect(chipText({ kind: 'await' }, '', labels)?.text).toBe('(anonymous) after await')
    expect(chipText({ kind: 'function' }, '', labels)).toBeNull()
  })

  it('bounds the work for a huge function', () => {
    const source = `f(${'a '.repeat(50_000)})`
    const result = chipText({ kind: 'function', loc: loc(source, source) }, source, labels)!
    expect(result.text).toHaveLength(MAX_CHIP_CHARS)
    expect(result.full.length).toBeLessThanOrEqual(500)
  })
})

describe('chipsOf', () => {
  it('has chips only for timers that have a card on screen', () => {
    const timers = Array.from({ length: MAX_WEB_API_CARDS + 3 }, (_, i) => ({
      tid: `timer-${i}`,
      taskId: `task-${i}`,
      dueUs: (i + 1) * 1000,
      clampedMs: i + 1,
      requestedMs: i + 1,
      repeat: false,
      callback: { kind: 'builtin' as const, name: 'log' },
    }))
    const state: ReplayState = { ...createInitialState(), timers }
    const chips = chipsOf(state, '', labels)
    expect([...chips.keys()]).toEqual(timers.slice(0, MAX_WEB_API_CARDS).map((t) => t.taskId))
  })
})
