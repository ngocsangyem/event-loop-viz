import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import { diagramModelOf } from '../diagram-model'

const caps = { stack: 2, webapis: 2, taskq: 2, microq: 2, console: 2 }
const frame = (n: number) => ({ frameId: `f${n}`, label: `fn${n}`, builtin: false })

describe('diagramModelOf', () => {
  it('shows the stack newest first, limited, with the overflow counted', () => {
    const state: ReplayState = { ...createInitialState(), stack: [frame(1), frame(2), frame(3)] }
    const { stack } = diagramModelOf(state, caps)
    expect(stack.rows.map((r) => r.label)).toEqual(['fn3', 'fn2'])
    expect(stack.rows[0]!.active).toBe(true)
    expect(stack.more).toBe(1)
  })

  it('lists the running Task first and keeps labels as message keys', () => {
    const state: ReplayState = {
      ...createInitialState(),
      tasks: [{ taskId: 'k2', source: 'timer' }],
      currentTask: 'k1',
      currentTaskSource: 'script',
    }
    const { taskq } = diagramModelOf(state, caps)
    expect(taskq.rows.map((r) => r.labelKey)).toEqual(['panels.taskSource.script', 'panels.taskSource.timer'])
    expect(taskq.rows[0]).toMatchObject({ detailKey: 'running', active: true })
  })

  it('tints warnings and errors in the newest console lines', () => {
    const state: ReplayState = {
      ...createInitialState(),
      console: [
        { kind: 'console', level: 'log', text: 'a' },
        { kind: 'console', level: 'warn', text: 'b' },
        { kind: 'uncaught-exception', message: 'boom' },
      ],
    }
    const { console: out } = diagramModelOf(state, caps)
    expect(out.rows.map((r) => r.tone)).toEqual(['warn', 'error'])
    expect(out.more).toBe(1)
  })

  it('is the same for the same state', () => {
    const state: ReplayState = { ...createInitialState(), stack: [frame(1)] }
    expect(diagramModelOf(state, caps)).toEqual(diagramModelOf({ ...state }, caps))
  })
})
