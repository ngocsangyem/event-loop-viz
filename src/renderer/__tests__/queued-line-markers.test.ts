import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../player/replay-state'
import type { CallbackInfo } from '../../trace/trace-event'
import { queuedLinesAt } from '../queued-line-markers'

const at = (line?: number): CallbackInfo => ({
  kind: 'function',
  ...(line !== undefined && { loc: { start: 0, end: 1, line, column: 0 } }),
})

describe('queuedLinesAt', () => {
  it('is empty when nothing is queued', () => {
    expect(queuedLinesAt(createInitialState()).size).toBe(0)
  })

  it('maps each queued callback to its line and concept', () => {
    const state = {
      ...createInitialState(),
      jobs: [{ jobId: 'j1', jobKind: 'reaction' as const, callback: at(4) }],
      tasks: [{ taskId: 't1', source: 'timer' as const, callback: at(2) }],
      timers: [{ tid: '1', requestedMs: 5, clampedMs: 5, repeat: false, dueUs: 5000, callback: at(2) }],
    }
    expect(queuedLinesAt(state)).toEqual(
      new Map([
        [4, ['job']],
        [2, ['task', 'webapi']],
      ]),
    )
  })

  it('keeps one square per concept and a stable order on a busy line', () => {
    const state = {
      ...createInitialState(),
      jobs: [
        { jobId: 'a', jobKind: 'microtask' as const, callback: at(1) },
        { jobId: 'b', jobKind: 'microtask' as const, callback: at(1) },
      ],
      timers: [{ tid: '1', requestedMs: 0, clampedMs: 4, repeat: false, dueUs: 4000, callback: at(1) }],
    }
    expect(queuedLinesAt(state).get(1)).toEqual(['job', 'webapi'])
  })

  it('skips callbacks that have no source line', () => {
    const state = {
      ...createInitialState(),
      jobs: [{ jobId: 'a', jobKind: 'reaction' as const, callback: at() }, { jobId: 'b', jobKind: 'reaction' as const }],
    }
    expect(queuedLinesAt(state).size).toBe(0)
  })
})
