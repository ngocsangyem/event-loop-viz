import type { CallbackHandle } from './engine-adapter'

/** A queued port-message Task. A message is ready the moment it is posted, so `dueUs` is its enqueue time. */
export interface PortMessageTask {
  taskId: string
  deliver: CallbackHandle
  dueUs: number
  /** Position in the host-wide enqueue order, shared with timers to break same-instant ties. */
  order: number
}

/**
 * FIFO of port-message Tasks. Enqueue time never decreases, so the head is always the oldest.
 * The event loop compares the head against the next timer to pick across sources.
 */
export function createPortMessageTasks() {
  const queue: PortMessageTask[] = []
  return {
    push: (task: PortMessageTask) => void queue.push(task),
    peek: (): PortMessageTask | undefined => queue[0],
    shift: (): PortMessageTask | undefined => queue.shift(),
  }
}

/** True when `a` was enqueued before `b` (earlier due time, then earlier enqueue order). */
export function enqueuedBefore(a: { dueUs: number; order: number }, b: { dueUs: number; order: number }) {
  return a.dueUs < b.dueUs || (a.dueUs === b.dueUs && a.order < b.order)
}
