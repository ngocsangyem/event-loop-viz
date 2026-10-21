// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { consoleMetaOf } from '../console-line-meta'
import type { TraceEvent, TraceEventBody } from '../../trace/trace-event'

const loc = (line: number) => ({ start: 0, end: 1, line, column: 1 })
const ev = (body: TraceEventBody, line?: number): TraceEvent =>
  ({ seq: 0, t: 0, ref: 'HTML:x', visible: true, ...(line && { loc: loc(line) }), ...body }) as TraceEvent

const events: TraceEvent[] = [
  ev({ k: 'task:begin', taskId: 'task-1' }),
  ev({ k: 'console', level: 'log', text: 'sync' }, 1),
  ev({ k: 'task:end', taskId: 'task-1' }),
  ev({ k: 'job:begin', jobId: 'job-1' }),
  ev({ k: 'console', level: 'log', text: 'job' }, 3),
  ev({ k: 'exception:report', origin: 'microtask-callback', message: 'x' }),
  ev({ k: 'job:end', jobId: 'job-1' }),
  ev({ k: 'task:begin', taskId: 'task-2' }),
  ev({ k: 'rejection:notify', pid: 'p1', outcome: 'unhandled', message: 'm' }, 9),
]

describe('consoleMetaOf', () => {
  it('names the source line and the Task or Job a line was printed in', () => {
    expect(consoleMetaOf(events, events.length - 1)).toEqual(['L1 · Task #1', 'L3 · Job #1', 'Job #1', 'L9 · Task #2'])
  })

  it('stops at the playhead, so meta lines up with the output folded to that position', () => {
    expect(consoleMetaOf(events, 1)).toEqual(['L1 · Task #1'])
    expect(consoleMetaOf(events, 0)).toEqual([])
  })

  it('is null for a line outside any Task or Job with no location', () => {
    expect(consoleMetaOf([ev({ k: 'console', level: 'log', text: 'x' })], 0)).toEqual([null])
  })

  it('returns to the enclosing Task when a Job ends inside it', () => {
    const nested = [
      ev({ k: 'task:begin', taskId: 'task-1' }),
      ev({ k: 'job:begin', jobId: 'job-2' }),
      ev({ k: 'job:end', jobId: 'job-2' }),
      ev({ k: 'console', level: 'log', text: 'x' }, 2),
    ]
    expect(consoleMetaOf(nested, 3)).toEqual(['L2 · Task #1'])
  })
})
