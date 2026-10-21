import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import { stepFocusOf } from '../step-focus-model'

const state = (patch: Partial<ReplayState>): ReplayState => ({ ...createInitialState(), ...patch })
const job = (jobId: string) => ({ jobId, jobKind: 'reaction' as never })
const task = (taskId: string) => ({ taskId, source: 'timer' as never })

describe('stepFocusOf', () => {
  it('marks nothing without a step to compare with', () => {
    const focus = stepFocusOf(null, state({ jobs: [job('j1')] }))
    expect([...focus.changed]).toEqual([])
    expect([...focus.newIds]).toEqual([])
  })

  it('marks the pane an entry entered and the entry itself as new', () => {
    const before = state({ jobs: [job('j1')] })
    const after = state({ jobs: [job('j1'), job('j2')] })
    const focus = stepFocusOf(before, after)
    expect([...focus.changed]).toEqual(['job'])
    expect([...focus.newIds]).toEqual(['j2'])
  })

  it('marks both panes when a Task leaves the queue to run', () => {
    const before = state({ tasks: [task('t1')] })
    const after = state({ currentTask: 't1', stack: [{ frameId: 'f1', label: 'cb', builtin: false }] })
    const focus = stepFocusOf(before, after)
    expect(focus.changed).toEqual(new Set(['task', 'stack', 'loop']))
    expect([...focus.newIds]).toEqual(['f1'])
  })

  it('ignores built-in frames the Call Stack hides', () => {
    const script = { frameId: 'f1', label: 'script', builtin: false }
    const resolve = { frameId: 'f2', label: 'resolve', builtin: true }
    const before = state({ stack: [script, resolve] })
    const after = state({ stack: [script, resolve, { frameId: 'f3', label: 'Promise', builtin: true }] })
    expect(stepFocusOf(before, after).changed.has('stack')).toBe(false)
  })

  it('marks the console when a line is printed', () => {
    const after = state({ console: [{ kind: 'console', level: 'log', text: 'x' } as never] })
    expect([...stepFocusOf(state({}), after).changed]).toEqual(['console'])
  })
})
