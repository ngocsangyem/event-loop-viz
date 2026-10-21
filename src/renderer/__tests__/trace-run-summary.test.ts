import { describe, expect, it } from 'vitest'
import { buildTrace, timerAndJobTrace } from '../../player/__tests__/hand-built-traces'
import { summarizeTrace } from '../trace-run-summary'

describe('summarizeTrace', () => {
  it('counts listed events, Ticks and the Virtual Clock span of a natural Run', () => {
    expect(summarizeTrace(timerAndJobTrace())).toEqual({
      events: 25, // 26 events, one Bookkeeping Event
      ticks: 2, // job-1 runs in Tick 1, job-2 (enqueued by job-1) in Tick 2
      startMs: 0,
      endMs: 10.005,
      outcome: 'natural',
    })
  })

  it('reports the Budget that halted the Run', () => {
    const trace = buildTrace([{ k: 'run:start' }, { k: 'run:halted', reason: 'tasks', limit: 5 }])
    expect(summarizeTrace(trace).outcome).toBe('tasks')
  })

  it('has zero Ticks without Jobs', () => {
    expect(summarizeTrace(buildTrace([{ k: 'run:start' }])).ticks).toBe(0)
  })
})
