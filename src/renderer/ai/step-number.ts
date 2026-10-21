import type { TraceEvent } from '../../trace/trace-event'

/** The step number a Trace event shows as: visible events up to and including it (at least 1). */
export function stepNumberAt(events: readonly TraceEvent[], seq: number): number {
  let n = 0
  for (const e of events) {
    if (e.seq > seq) break
    if (e.visible) n++
  }
  return Math.max(1, n)
}
