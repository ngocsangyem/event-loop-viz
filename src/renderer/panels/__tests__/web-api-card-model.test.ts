import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { PendingTimer } from '../../../player/replay-state'
import { webApiCardsOf } from '../web-api-card-model'

const timer = (over: Partial<PendingTimer>): PendingTimer => ({
  tid: 't1',
  requestedMs: 10,
  clampedMs: 10,
  repeat: false,
  dueUs: 10_000,
  taskId: 'task-1',
  ...over,
})
const stateOf = (timers: PendingTimer[], clockUs = 0) => ({ ...createInitialState(), timers, clockUs })

const firstCard = (timers: PendingTimer[], clockUs = 0) => {
  const card = webApiCardsOf(stateOf(timers, clockUs)).cards[0]
  if (!card) throw new Error('expected a card')
  return card
}

describe('webApiCardsOf', () => {
  it('orders soonest due first and keeps arming order on ties', () => {
    const { cards } = webApiCardsOf(
      stateOf([
        timer({ tid: 'a', taskId: 'ta', dueUs: 20_000 }),
        timer({ tid: 'b', taskId: 'tb', dueUs: 5_000 }),
        timer({ tid: 'c', taskId: 'tc', dueUs: 5_000 }),
      ]),
    )
    expect(cards.map((c) => c.tid)).toEqual(['b', 'c', 'a'])
  })
  it('derives remaining time and progress from the clock, clamped to 0..1', () => {
    const t = timer({})
    const at = (clockUs: number) => firstCard([t], clockUs)
    expect(at(0)).toMatchObject({ left: '10ms', progress: 0, delay: '10ms' })
    expect(at(2_500)).toMatchObject({ left: '7.5ms', progress: 0.25 })
    expect(at(50_000)).toMatchObject({ left: '0ms', progress: 1 })
    expect(at(-5_000).progress).toBe(0)
  })
  it('treats a zero delay as already complete', () => {
    expect(firstCard([timer({ requestedMs: 0, clampedMs: 0, dueUs: 0 })]).progress).toBe(1)
  })
  it('flags a clamped delay and names setInterval for repeating timers', () => {
    const card = firstCard([timer({ requestedMs: 1, clampedMs: 4, repeat: true })])
    expect(card).toMatchObject({ clamped: true, delay: '4ms', requestedMs: 1, api: 'setInterval', repeat: true })
    expect(firstCard([timer({})])).toMatchObject({ clamped: false, api: 'setTimeout' })
  })
  it('keys by task id so an interval re-arm is a new card', () => {
    const first = firstCard([timer({ repeat: true, taskId: 'task-1' })])
    const rearmed = firstCard([timer({ repeat: true, taskId: 'task-2' })])
    expect(first.tid).toBe(rearmed.tid)
    expect(first.key).not.toBe(rearmed.key)
    expect(firstCard([timer({ taskId: undefined })]).key).toBe('t1')
  })
  it('caps the cards and counts the hidden ones', () => {
    const timers = Array.from({ length: 8 }, (_, i) => timer({ tid: `t${i}`, taskId: `k${i}`, dueUs: i * 1000 }))
    const model = webApiCardsOf(stateOf(timers))
    expect(model.cards).toHaveLength(6)
    expect(model.hidden).toBe(2)
  })
})
