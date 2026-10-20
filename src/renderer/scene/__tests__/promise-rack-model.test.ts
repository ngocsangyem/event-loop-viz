import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import { promiseRackOf } from '../promise-rack-model'

const stateWith = (patch: Partial<ReplayState>): ReplayState => ({
  ...createInitialState(),
  ...patch,
})
const CAPACITY = { rows: 3, generators: 2 }

describe('promiseRackOf', () => {
  it('is empty before any promise exists', () => {
    expect(promiseRackOf(createInitialState(), CAPACITY)).toEqual({
      rows: [],
      hiddenPromises: 0,
      generators: [],
    })
  })

  it('shows each promise with its state, in creation order', () => {
    const model = promiseRackOf(
      stateWith({ promises: { p2: 'rejected', p10: 'pending', p1: 'fulfilled' } }),
      CAPACITY,
    )
    expect(model.rows.map((r) => [r.pid, r.view])).toEqual([
      ['p1', 'fulfilled'],
      ['p2', 'rejected'],
      ['p10', 'pending'],
    ])
  })

  it('pairs a suspended function with the promise it waits on', () => {
    const model = promiseRackOf(
      stateWith({
        promises: { p1: 'pending' },
        suspendedAwaits: [{ fid: 'frame-7', label: 'f', pid: 'p1' }],
      }),
      CAPACITY,
    )
    expect(model.rows).toEqual([
      { pid: 'p1', view: 'pending', waiter: { fid: 'frame-7', label: 'f' }, extraWaiters: 0 },
    ])
  })

  it('counts further waiters on the same promise instead of drawing them', () => {
    const model = promiseRackOf(
      stateWith({
        promises: { p1: 'pending' },
        suspendedAwaits: [
          { fid: 'a', label: 'a', pid: 'p1' },
          { fid: 'b', label: 'b', pid: 'p1' },
        ],
      }),
      CAPACITY,
    )
    expect(model.rows[0]).toMatchObject({ waiter: { fid: 'a' }, extraWaiters: 1 })
  })

  it('keeps awaited and pending promises over old settled ones when space runs out', () => {
    const model = promiseRackOf(
      stateWith({
        promises: {
          p1: 'fulfilled',
          p2: 'fulfilled',
          p3: 'pending',
          p4: 'fulfilled',
          p5: 'pending',
        },
        suspendedAwaits: [{ fid: 'f', label: 'f', pid: 'p1' }],
      }),
      CAPACITY,
    )
    expect(model.rows.map((r) => r.pid)).toEqual(['p1', 'p3', 'p5'])
    expect(model.hiddenPromises).toBe(2)
  })

  it('keeps a rejected promise on the rack over newer fulfilled ones', () => {
    const model = promiseRackOf(
      stateWith({
        promises: { p1: 'rejected', p2: 'fulfilled', p3: 'fulfilled', p4: 'fulfilled' },
      }),
      CAPACITY,
    )
    expect(model.rows.map((r) => r.pid)).toEqual(['p1', 'p3', 'p4'])
  })

  it('draws a row for an awaited promise missing from the table, as pending', () => {
    const model = promiseRackOf(
      stateWith({ suspendedAwaits: [{ fid: 'f', label: 'f', pid: 'p9' }] }),
      CAPACITY,
    )
    expect(model.rows.map((r) => [r.pid, r.view])).toEqual([['p9', 'pending']])
  })

  it('lists the most recent async generators with their states', () => {
    const model = promiseRackOf(
      stateWith({ asyncGens: { g1: 'yielded', g2: 'running', g3: 'awaiting-return' } }),
      CAPACITY,
    )
    expect(model.generators).toEqual([
      { gid: 'g2', view: 'running' },
      { gid: 'g3', view: 'awaiting-return' },
    ])
  })
})
