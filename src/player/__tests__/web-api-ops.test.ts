import { describe, expect, it } from 'vitest'
import { createPlayer } from '../player'
import { buildTrace } from './hand-built-traces'

/** A fetch whose response is queued after 30 ms, and a rAF callback cancelled in its frame. */
const trace = buildTrace([
  { k: 'run:start' },
  { k: 'webapi:start', opId: 'op-1', api: 'fetch', taskId: 'task-2', dueUs: 30_000, detail: 'https://api.test/a', callback: { kind: 'builtin', name: 'fetch response' } },
  { k: 'webapi:start', opId: 'op-2', api: 'requestAnimationFrame', taskId: 'task-3' },
  { k: 'render:frame', frameMs: 4, callbacks: 1, t: 4_000 },
  { k: 'task:queue', taskId: 'task-3', source: 'animation-frame', opId: 'op-2' },
  { k: 'webapi:cancel', opId: 'op-2' },
  { k: 'task:queue', taskId: 'task-2', source: 'networking', opId: 'op-1', t: 30_000 },
  { k: 'run:halted', reason: 'natural' },
])

describe('Web API operations in the replay', () => {
  const player = createPlayer(trace)

  it('shows a started operation as pending, with its start time', () => {
    expect(player.stateAt(2).webOps).toEqual([
      { opId: 'op-1', api: 'fetch', taskId: 'task-2', dueUs: 30_000, startUs: 0, detail: 'https://api.test/a', callback: { kind: 'builtin', name: 'fetch response' } },
      { opId: 'op-2', api: 'requestAnimationFrame', taskId: 'task-3', startUs: 0 },
    ])
  })

  it('moves an operation to the Task Queue when its Task is queued, keeping its callback', () => {
    const state = player.stateAt(4)
    expect(state.webOps.map((o) => o.opId)).toEqual(['op-1'])
    expect(state.tasks).toEqual([{ taskId: 'task-3', source: 'animation-frame', opId: 'op-2' }])
  })

  it('drops a cancelled operation and the Task it had queued', () => {
    expect(player.stateAt(5).tasks).toEqual([])
  })

  it('takes the operation callback onto the queued Task when the event names none', () => {
    expect(player.stateAt(6).tasks).toEqual([
      { taskId: 'task-2', source: 'networking', opId: 'op-1', callback: { kind: 'builtin', name: 'fetch response' } },
    ])
    expect(player.stateAt(6).webOps).toEqual([])
  })
})
