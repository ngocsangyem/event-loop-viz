import { describe, expect, it } from 'vitest'
import { deriveObservableOutput } from '../derive-observable-output'
import type { TraceEvent } from '../trace-event'

const base = { t: 0, ref: 'HTML:#event-loop-processing-model' as const, visible: true }

describe('deriveObservableOutput', () => {
  it('keeps only console events and exception reports, in order', () => {
    const events: TraceEvent[] = [
      { ...base, seq: 0, k: 'run:start' },
      { ...base, seq: 1, k: 'console', level: 'log', text: 'a' },
      { ...base, seq: 2, k: 'frame:push', frameId: 'f1', label: 'x', builtin: false },
      { ...base, seq: 3, k: 'exception:report', origin: 'task-callback', message: 'boom' },
      { ...base, seq: 4, k: 'console', level: 'warn', text: 'b' },
      { ...base, seq: 5, k: 'run:halted', reason: 'natural' },
    ]
    expect(deriveObservableOutput(events)).toEqual([
      { kind: 'console', level: 'log', text: 'a' },
      { kind: 'uncaught-exception', message: 'boom' },
      { kind: 'console', level: 'warn', text: 'b' },
    ])
  })
})
