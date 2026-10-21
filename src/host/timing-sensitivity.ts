/**
 * Detects Runs whose ordering could differ from the Oracle because the Virtual Clock
 * charges 1 us per node while real Chrome runs faster or slower.
 *
 * A compute boundary is the end of a Task (with its Checkpoint) that computed for at
 * least MIN_COMPUTE_US. A pending timer due within WINDOW_US of that boundary could
 * land on either side of it in real Chrome. Trivially short Tasks are ignored: their
 * boundary is so close to the start that ordering is decided by the delays alone.
 */
const WINDOW_US = 2_000
const MIN_COMPUTE_US = 1_000

export function createTimingSensitivityTracker() {
  let sensitive = false
  return {
    /** Call when a Task and its Checkpoint finished; `pendingDueUs` are the timers still queued. */
    taskEnded(startUs: number, endUs: number, pendingDueUs: Iterable<number>): void {
      if (sensitive || endUs - startUs < MIN_COMPUTE_US) return
      for (const dueUs of pendingDueUs) {
        if (Math.abs(dueUs - endUs) <= WINDOW_US) {
          sensitive = true
          return
        }
      }
    },
    get timingSensitive() {
      return sensitive
    },
  }
}
