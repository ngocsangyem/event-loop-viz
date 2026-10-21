import type { TraceEvent } from '../trace/trace-event'
import { jobRef, taskRef } from './panels/queue-item-labels'

/** The Trace Events that put a line in the console (the same ones the player folds into Observable Output). */
const OUTPUT_KINDS = new Set<TraceEvent['k']>(['console', 'exception:report', 'rejection:notify'])

/**
 * Where each console line came from, as `L3 · Job #1`: the source line the Trace Event carries and
 * the Task or Job that was running when it happened. One entry per output line up to `position`,
 * in output order; null when the Trace names neither. Derived from the Trace here so the
 * Observable Output stays exactly what Chrome shows.
 */
export function consoleMetaOf(events: readonly TraceEvent[], position: number): (string | null)[] {
  const meta: (string | null)[] = []
  let task: string | null = null
  let job: string | null = null
  const last = Math.min(position, events.length - 1)
  for (let i = 0; i <= last; i++) {
    const event = events[i]!
    switch (event.k) {
      case 'task:begin':
        task = event.taskId
        break
      case 'task:end':
        if (task === event.taskId) task = null
        break
      case 'job:begin':
        job = event.jobId
        break
      case 'job:end':
        if (job === event.jobId) job = null
        break
      default:
        if (OUTPUT_KINDS.has(event.k)) {
          // A Job runs on top of whatever Task is current, so the Job is the closer answer.
          const owner = job ? jobRef(job) : task ? taskRef(task) : null
          const parts = [event.loc ? `L${event.loc.line}` : null, owner].filter((part) => part !== null)
          meta.push(parts.length > 0 ? parts.join(' · ') : null)
        }
    }
  }
  return meta
}
