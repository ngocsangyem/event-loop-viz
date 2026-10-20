import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { PendingTimer, ReplayState } from '../../../player/replay-state'
import { formatVirtualMs, timerShelfOf } from '../timer-shelf-model'

const timer = (tid: string, dueUs: number, repeat = false): PendingTimer => ({
  tid,
  requestedMs: 0,
  clampedMs: 0,
  repeat,
  dueUs,
})
const stateWith = (patch: Partial<ReplayState>): ReplayState => ({
  ...createInitialState(),
  ...patch,
})

describe('formatVirtualMs', () => {
  it.each([
    [0, '0ms'],
    [10000, '10ms'],
    [10005, '10ms'],
    [1500, '1.5ms'],
    [250, '0.3ms'],
    [1234567, '1234.6ms'],
  ])('writes %i microseconds as %s', (us, text) => {
    expect(formatVirtualMs(us)).toBe(text)
  })
})

describe('timerShelfOf', () => {
  it('reads the Virtual Clock', () => {
    expect(timerShelfOf(stateWith({ clockUs: 12500 }), 8).clock).toBe('12.5ms')
  })

  it('lists pending timers soonest first with their due time', () => {
    const model = timerShelfOf(
      stateWith({ timers: [timer('2', 50000), timer('1', 10000, true), timer('3', 10000)] }),
      8,
    )
    expect(model.shown).toEqual([
      { tid: '1', due: '10ms', repeat: true },
      { tid: '3', due: '10ms', repeat: false },
      { tid: '2', due: '50ms', repeat: false },
    ])
    expect(model.hidden).toBe(0)
  })

  it('counts the timers that do not fit on the shelf', () => {
    const timers = [1, 2, 3, 4, 5].map((n) => timer(String(n), n * 1000))
    const model = timerShelfOf(stateWith({ timers }), 3)
    expect(model.shown.map((t) => t.tid)).toEqual(['1', '2', '3'])
    expect(model.hidden).toBe(2)
  })
})
