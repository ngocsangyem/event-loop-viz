import type { HaltReason, Trace } from '../trace/trace-event'

export interface TraceRunSummary {
  /** Events the Why rail lists; Bookkeeping Events are not counted. */
  events: number
  /** Rounds of the microtask queue, the deepest Tick any Job ran in (0 without Jobs). */
  ticks: number
  /** Virtual Clock at the first and last event, milliseconds. */
  startMs: number
  endMs: number
  /** `natural` when the Run ended on its own; otherwise the Budget that stopped it. */
  outcome: HaltReason
}

/** The facts a finished Run is described by: size, depth and how it ended. */
export function summarizeTrace(trace: Trace): TraceRunSummary {
  const { events } = trace
  // Mirrors the reducer: a Job enqueued by Script code runs in Tick 1, one enqueued by a Job a Tick later.
  const jobTicks = new Map<string, number>()
  let current: number | null = null
  let ticks = 0
  let visible = 0
  for (const event of events) {
    if (event.visible) visible++
    if (event.k === 'job:enqueue') jobTicks.set(event.jobId, (current ?? 0) + 1)
    else if (event.k === 'job:begin') {
      current = jobTicks.get(event.jobId) ?? 1
      ticks = Math.max(ticks, current)
    } else if (event.k === 'job:end') current = null
  }
  const last = events[events.length - 1]
  return {
    events: visible,
    ticks,
    startMs: (events[0]?.t ?? 0) / 1000,
    endMs: (last?.t ?? 0) / 1000,
    outcome: last?.k === 'run:halted' ? last.reason : 'natural',
  }
}
