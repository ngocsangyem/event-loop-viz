import type { TaskSource } from '../trace/trace-event'
import type { CallbackHandle, QueueTaskOptions } from './engine-adapter'
import type { HostRunContext } from './host-run-context'
import { HTML_LOOP, HTML_PORT_MESSAGE, HTML_POSTED_MESSAGE, HTML_NETWORKING, HTML_JS_ENGINE } from './host-spec-references'

/**
 * A Task of a source other than timers (port and posted messages, network responses, cleanup
 * jobs). `dueUs` is when it joins its queue: the moment it is posted, or later for a delayed one
 * (network latency). `order` is the host-wide enqueue order, shared with timers.
 */
export interface HostTask {
  taskId: string
  source: TaskSource
  run: CallbackHandle
  dueUs: number
  order: number
  opId?: string
  /** True once the Virtual Clock reached dueUs and the task:queue event was emitted. */
  queued: boolean
}

const REF_OF: Partial<Record<TaskSource, `HTML:${string}`>> = {
  'port-message': HTML_PORT_MESSAGE,
  'posted-message': HTML_POSTED_MESSAGE,
  networking: HTML_NETWORKING,
  'javascript-engine': HTML_JS_ENGINE,
}

/**
 * Tasks of every non-timer source in one list. A ready Task is queued the moment it is posted, so
 * the earliest (dueUs, order) entry is always the oldest; the event loop compares it with the
 * next timer to pick across sources (oldest enqueue wins, Host Profile chrome-155).
 */
export function createHostTaskQueue(ctx: HostRunContext, nextOrder: () => number) {
  const tasks: HostTask[] = []

  const emitQueued = (task: HostTask, options: QueueTaskOptions) => {
    task.queued = true
    const callback = options.callback ?? task.run.info
    ctx.emit(
      {
        k: 'task:queue',
        taskId: task.taskId,
        source: task.source,
        dueUs: task.dueUs,
        ...(task.opId !== undefined && { opId: task.opId }),
        ...(callback && { callback }),
      },
      REF_OF[task.source] ?? HTML_LOOP,
    )
  }
  const optionsOf = new WeakMap<HostTask, QueueTaskOptions>()

  return {
    queue(source: TaskSource, run: CallbackHandle, options: QueueTaskOptions = {}): string {
      const task: HostTask = {
        taskId: options.taskId ?? ctx.newTaskId(),
        source,
        run,
        dueUs: ctx.clock.nowUs + Math.max(0, options.delayMs ?? 0) * 1000,
        order: nextOrder(),
        ...(options.opId !== undefined && { opId: options.opId }),
        queued: false,
      }
      tasks.push(task)
      optionsOf.set(task, options)
      if (task.dueUs <= ctx.clock.nowUs) emitQueued(task, options)
      return task.taskId
    },
    /** The Virtual Clock advanced: delayed Tasks that are now due join their queue, oldest first. */
    queueDue(nowUs: number) {
      const due = tasks.filter((t) => !t.queued && t.dueUs <= nowUs).sort((a, b) => a.dueUs - b.dueUs || a.order - b.order)
      if (due.length === 0) return
      // A clock tick, not part of the node being evaluated: no source location.
      const savedLoc = ctx.clock.loc
      ctx.clock.loc = undefined
      try {
        for (const task of due) emitQueued(task, optionsOf.get(task) ?? {})
      } finally {
        ctx.clock.loc = savedLoc
      }
    },
    /** The Task that runs first among these sources: earliest due, then earliest enqueued. */
    peek(): HostTask | undefined {
      let best: HostTask | undefined
      for (const t of tasks) if (!best || t.dueUs < best.dueUs || (t.dueUs === best.dueUs && t.order < best.order)) best = t
      return best
    },
    remove(task: HostTask) {
      const at = tasks.indexOf(task)
      if (at !== -1) tasks.splice(at, 1)
    },
    pendingDueUs: () => tasks.filter((t) => !t.queued).map((t) => t.dueUs),
    handles: () => tasks.map((t) => t.run),
  }
}

/** True when `a` was enqueued before `b` (earlier due time, then earlier enqueue order). */
export function enqueuedBefore(a: { dueUs: number; order: number }, b: { dueUs: number; order: number }) {
  return a.dueUs < b.dueUs || (a.dueUs === b.dueUs && a.order < b.order)
}
