import type { TraceEvent } from '../trace/trace-event'

/**
 * Where the playhead is, counted in steps a learner sees: the number of visible Trace Events up
 * to and including `position`, out of all visible ones. Bookkeeping Events never count, so the
 * caption and the dock agree with the Ask AI context line.
 */
export function stepProgressOf(events: readonly TraceEvent[], position: number) {
  let step = 0
  let total = 0
  for (let i = 0; i < events.length; i++) {
    if (!events[i]!.visible) continue
    total++
    if (i <= position) step++
  }
  return { step: Math.max(step, total > 0 ? 1 : 0), total }
}
