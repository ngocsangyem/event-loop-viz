import { describe, expect, it } from 'vitest'
import { createPlayer } from '../player'
import { buildTrace } from './hand-built-traces'

// An async function `f` parks at an await on p2, a Job settles it, then `f` continues.
const awaitTrace = () =>
  buildTrace([
    { k: 'run:start' }, // 0
    { k: 'frame:push', frameId: 'frame-7', label: 'f', builtin: false }, // 1
    { k: 'promise:create', pid: 'p2' }, // 2
    { k: 'await:suspend', fid: 'frame-7', awaitedPid: 'p2' }, // 3
    { k: 'frame:pop', frameId: 'frame-7', label: 'f', builtin: false }, // 4
    { k: 'promise:settle', pid: 'p2', state: 'fulfilled' }, // 5
    { k: 'await:resume', fid: 'frame-7', mode: 'next' }, // 6
    { k: 'frame:push', frameId: 'frame-7', label: 'f', builtin: false }, // 7
  ])

describe('suspended awaits in ReplayState', () => {
  const player = createPlayer(awaitTrace())

  it('has none before the function reaches its await', () => {
    expect(player.stateAt(2).suspendedAwaits).toEqual([])
  })

  it('parks the function with the promise it waits on, named by its frame', () => {
    expect(player.stateAt(3).suspendedAwaits).toEqual([{ fid: 'frame-7', label: 'f', pid: 'p2' }])
    // Still parked after the frame left the stack and while the promise settles.
    expect(player.stateAt(5).suspendedAwaits).toHaveLength(1)
  })

  it('releases the function exactly at await:resume', () => {
    expect(player.stateAt(6).suspendedAwaits).toEqual([])
  })

  it('falls back to the frame id when the frame is not on the stack', () => {
    const trace = buildTrace([{ k: 'run:start' }, { k: 'await:suspend', fid: 'frame-9' }])
    expect(createPlayer(trace).stateAt(1).suspendedAwaits).toEqual([
      { fid: 'frame-9', label: 'frame-9' },
    ])
  })
})

describe('async generators in ReplayState', () => {
  const trace = buildTrace([
    { k: 'run:start' }, // 0
    { k: 'asyncgen:resume', gid: 'g1' }, // 1
    { k: 'asyncgen:yield', gid: 'g1' }, // 2
    { k: 'asyncgen:resume', gid: 'g1' }, // 3
    { k: 'asyncgen:return-await', gid: 'g2' }, // 4
  ])
  const player = createPlayer(trace)

  it('follows each generator through resume, yield and return-await', () => {
    expect(player.stateAt(0).asyncGens).toEqual({})
    expect(player.stateAt(1).asyncGens).toEqual({ g1: 'running' })
    expect(player.stateAt(2).asyncGens).toEqual({ g1: 'yielded' })
    expect(player.stateAt(3).asyncGens).toEqual({ g1: 'running' })
    expect(player.stateAt(4).asyncGens).toEqual({ g1: 'running', g2: 'awaiting-return' })
  })
})
