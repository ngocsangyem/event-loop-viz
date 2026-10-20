import type { EngineAdapter } from './engine-adapter'
import {
  HTML_CHECKPOINT,
  HTML_LOOP,
  HTML_NOTIFY_REJECTED,
  HTML_REPORT,
} from './host-spec-references'
import type { HostRunContext } from './host-run-context'
import type { NotificationTask, createRejectionTracker } from './rejection-tracker'

/**
 * Microtask Checkpoints and the rejection-notification Tasks they can spawn. They live
 * together because a notification Task ends with a Checkpoint, and a Checkpoint can queue
 * more notification Tasks.
 */
export function createCheckpointRunner(
  ctx: HostRunContext,
  engine: EngineAdapter,
  rejections: ReturnType<typeof createRejectionTracker>,
  /** seq of each Job's job:enqueue event, so job:begin can point back to it. */
  jobEnqueueSeq: ReadonlyMap<string, number>,
) {
  function queueNotification(
    rejected: { pid: string; message: string },
    outcome: NotificationTask['outcome'],
  ) {
    const task: NotificationTask = {
      ...rejected,
      taskId: ctx.newTaskId(),
      dueUs: ctx.clock.nowUs,
      outcome,
    }
    ctx.emit({ k: 'task:queue', taskId: task.taskId, source: 'dom-manipulation' }, HTML_NOTIFY_REJECTED)
    rejections.enqueue(task)
  }

  function checkpoint(reason: 'task-end' | 'script-end') {
    ctx.emit({ k: 'checkpoint:begin', reason }, HTML_CHECKPOINT)
    // Jobs enqueued while a Job runs join the back of the queue and run in this same Checkpoint.
    for (;;) {
      const jobId = engine.runNextJob(
        (id) => ctx.emit({ k: 'job:begin', jobId: id }, HTML_CHECKPOINT, true, jobEnqueueSeq.get(id)),
        (message, unsupportedApi) =>
          ctx.emit(
            {
              k: 'exception:report',
              origin: 'microtask-callback',
              message,
              ...(unsupportedApi && { unsupportedApi }),
            },
            HTML_REPORT,
          ),
      )
      if (jobId === undefined) break
      ctx.emit({ k: 'job:end', jobId }, HTML_CHECKPOINT)
    }
    // Notify about rejected promises runs after the Jobs drain (HTML perform a microtask checkpoint).
    for (const rejected of rejections.takeAboutToBeNotified()) queueNotification(rejected, 'unhandled')
    ctx.emit({ k: 'checkpoint:end', reason }, HTML_CHECKPOINT)
  }

  /** Runs a queued unhandledrejection / rejectionhandled notification as its own Task. */
  function runNotification(task: NotificationTask) {
    ctx.clock.loc = undefined
    ctx.emit({ k: 'task:begin', taskId: task.taskId }, HTML_LOOP)
    ctx.emit(
      { k: 'rejection:notify', pid: task.pid, outcome: task.outcome, message: task.message },
      HTML_NOTIFY_REJECTED,
    )
    ctx.emit({ k: 'task:end', taskId: task.taskId }, HTML_LOOP)
    checkpoint('task-end')
  }

  return { checkpoint, queueNotification, runNotification }
}
