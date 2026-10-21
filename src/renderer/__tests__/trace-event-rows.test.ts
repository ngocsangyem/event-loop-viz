import { describe, expect, it } from 'vitest'
import type { TraceEvent } from '../../trace/trace-event'
import { eventTag } from '../trace-event-tag'
import { buildEventRows, rowIndexOfSeq, taskTurnsOf } from '../trace-event-rows'

const base = { t: 0, ref: 'HTML:event-loop' as const, visible: true }
const trace: TraceEvent[] = [
  { ...base, seq: 0, k: 'run:start' },
  { ...base, seq: 1, k: 'task:queue', taskId: 'task-1', source: 'script' },
  { ...base, seq: 2, k: 'task:begin', taskId: 'task-1' },
  { ...base, seq: 3, k: 'console', level: 'log', text: 'a' },
  { ...base, seq: 4, k: 'task:queue', taskId: 'task-2', source: 'timer' },
  { ...base, seq: 5, k: 'task:end', taskId: 'task-1' },
  { ...base, seq: 6, k: 'task:begin', taskId: 'task-2' },
  { ...base, seq: 7, k: 'console', level: 'error', text: 'b' },
]

describe('buildEventRows', () => {
  it('puts a header before the first event of each Task turn and none before the first Task', () => {
    const rows = buildEventRows(trace, taskTurnsOf(trace))
    expect(rows.filter((r) => r.type === 'group').map((r) => (r.type === 'group' ? [r.seq, r.taskId, r.source] : []))).toEqual([
      [2, 'task-1', 'script'],
      [6, 'task-2', 'timer'],
    ])
    expect(rows[0]).toMatchObject({ type: 'event' })
    expect(rows).toHaveLength(trace.length + 2)
  })

  it('keeps turns when rows are filtered, and drops a header whose turn has no rows', () => {
    const onlyLogs = trace.filter((e) => e.k === 'console')
    const rows = buildEventRows(onlyLogs, taskTurnsOf(trace))
    expect(rows.map((r) => r.type)).toEqual(['group', 'event', 'group', 'event'])
  })
})

describe('rowIndexOfSeq', () => {
  const rows = buildEventRows(trace, taskTurnsOf(trace))
  it('finds the event line, not its group header', () => {
    expect(rows[rowIndexOfSeq(rows, 2)]).toMatchObject({ type: 'event', event: { seq: 2 } })
    expect(rows[rowIndexOfSeq(rows, 7)]).toMatchObject({ type: 'event', event: { seq: 7 } })
  })
  it('returns -1 for a seq that is filtered out', () => {
    expect(rowIndexOfSeq(buildEventRows([trace[0]!, trace[7]!], taskTurnsOf(trace)), 3)).toBe(-1)
  })
})

describe('eventTag', () => {
  it('maps kinds to the concept tags', () => {
    expect(eventTag(trace[3]!).label).toBe('LOG')
    expect(eventTag(trace[7]!).label).toBe('ERR')
    expect(eventTag(trace[2]!).label).toBe('TASK')
    expect(eventTag({ ...base, seq: 9, k: 'run:halted', reason: 'tasks' }).label).toBe('HALT')
    expect(eventTag({ ...base, seq: 9, k: 'frame:push', frameId: 'f', label: 'x', builtin: false }).label).toBe('STACK')
  })
})
