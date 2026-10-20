import { TRACE_SCHEMA_VERSION } from '../../trace/trace-event'
import type { SourceLocation, Trace, TraceEvent, TraceEventBody } from '../../trace/trace-event'

export const loc = (start: number): SourceLocation => ({
  start,
  end: start + 1,
  line: 1,
  column: start,
})

type Spec = TraceEventBody & { t?: number; loc?: SourceLocation; cause?: number; visible?: boolean }

/** Builds a Trace from event bodies; seq is assigned densely, `t` defaults to the previous event's. */
export function buildTrace(specs: Spec[]): Trace {
  let t = 0
  const events = specs.map((spec, seq): TraceEvent => {
    t = spec.t ?? t
    return { ref: 'HTML:event-loop', visible: true, ...spec, seq, t } as TraceEvent
  })
  return {
    header: {
      schemaVersion: TRACE_SCHEMA_VERSION,
      engine: { name: 'engine262', commit: 'test', patch: 'test' },
      hostProfile: 'chrome-155',
      budgets: { nodes: 1, tasks: 1, virtualMs: 1, events: 1 },
      nodeCostUs: 1,
      randomSeed: 0,
      source: '',
      unsupportedApis: [],
      timingSensitive: false,
    },
    events,
  }
}

/**
 * The Script Task logs 'sync', sets a 10 ms timer and settles a promise; two Jobs run in
 * two Ticks of the Checkpoint; the timer Task fires later. Index comments are seq values.
 */
export function timerAndJobTrace(): Trace {
  return buildTrace([
    { k: 'run:start' }, // 0
    { k: 'task:queue', taskId: 'task-1', source: 'script' }, // 1
    { k: 'task:begin', taskId: 'task-1' }, // 2
    { k: 'frame:push', frameId: 'f1', label: '(script)', builtin: false, loc: loc(0) }, // 3
    { k: 'timer:init', tid: '1', requestedMs: 10, clampedMs: 10, nesting: 1, repeat: false, t: 5 }, // 4
    { k: 'task:queue', taskId: 'task-2', source: 'timer', dueUs: 10005 }, // 5
    { k: 'promise:create', pid: 'p1', visible: false }, // 6
    { k: 'promise:settle', pid: 'p1', state: 'fulfilled' }, // 7
    { k: 'promise:reaction', pid: 'p1', via: 'then', pending: false }, // 8
    { k: 'job:enqueue', jobId: 'job-1', jobKind: 'reaction', pid: 'p1', outcome: 'fulfill', cause: 8 }, // 9
    { k: 'console', level: 'log', text: 'sync', loc: loc(7) }, // 10
    { k: 'frame:pop', frameId: 'f1', label: '(script)', builtin: false }, // 11
    { k: 'task:end', taskId: 'task-1' }, // 12
    { k: 'checkpoint:begin', reason: 'task-end' }, // 13
    { k: 'job:begin', jobId: 'job-1', cause: 9 }, // 14
    { k: 'frame:push', frameId: 'f2', label: 'then cb', builtin: false, loc: loc(20) }, // 15
    { k: 'job:enqueue', jobId: 'job-2', jobKind: 'microtask', cause: 15, loc: loc(20) }, // 16
    { k: 'frame:pop', frameId: 'f2', label: 'then cb', builtin: false }, // 17
    { k: 'job:end', jobId: 'job-1' }, // 18
    { k: 'job:begin', jobId: 'job-2', cause: 16 }, // 19
    { k: 'job:end', jobId: 'job-2' }, // 20
    { k: 'checkpoint:end', reason: 'task-end' }, // 21
    { k: 'task:begin', taskId: 'task-2', t: 10005 }, // 22
    { k: 'timer:fire', tid: '1' }, // 23
    { k: 'console', level: 'log', text: 'timer' }, // 24
    { k: 'task:end', taskId: 'task-2' }, // 25
  ])
}
