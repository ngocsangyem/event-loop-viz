import type { CallbackHandle } from './engine-adapter'
import type { HostRunContext } from './host-run-context'
import { HTML_PORT_MESSAGE } from './host-spec-references'

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
export function createPortMessageTasks(ctx: HostRunContext, nextOrder: () => number) {
  const queue: PortMessageTask[] = []
  return {
    /** Posts a message: queues a Task due now that will call `deliver`. */
    enqueue(deliver: CallbackHandle) {
      const task = { taskId: ctx.newTaskId(), deliver, dueUs: ctx.clock.nowUs, order: nextOrder() }
      ctx.emit(
        {
          k: 'task:queue',
          taskId: task.taskId,
          source: 'port-message',
          dueUs: task.dueUs,
          ...(deliver.info && { callback: deliver.info }),
        },
        HTML_PORT_MESSAGE,
      )
      queue.push(task)
    },
    peek: (): PortMessageTask | undefined => queue[0],
    shift: (): PortMessageTask | undefined => queue.shift(),
  }
}

/** True when `a` was enqueued before `b` (earlier due time, then earlier enqueue order). */
export function enqueuedBefore(a: { dueUs: number; order: number }, b: { dueUs: number; order: number }) {
  return a.dueUs < b.dueUs || (a.dueUs === b.dueUs && a.order < b.order)
}
