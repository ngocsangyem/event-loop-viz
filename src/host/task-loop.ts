import type { CallbackHandle, EngineAdapter, InvokeIo, UncaughtError } from './engine-adapter'
import type { HostRunContext } from './host-run-context'
import type { createTimerScheduler } from './timer-scheduler'
import type { createHostTaskQueue } from './host-task-queue'
import type { createAnimationFrameScheduler } from './animation-frame-scheduler'
import type { createRejectionTracker } from './rejection-tracker'
import type { createTimingSensitivityTracker } from './timing-sensitivity'
import { enqueuedBefore } from './host-task-queue'
import { HTML_LOOP, HTML_RENDERING, HTML_TIMERS } from './host-spec-references'

export interface TaskLoopParts {
  ctx: HostRunContext
  engine: EngineAdapter
  timers: ReturnType<typeof createTimerScheduler>
  hostTasks: ReturnType<typeof createHostTaskQueue>
  frames: ReturnType<typeof createAnimationFrameScheduler>
  rejections: ReturnType<typeof createRejectionTracker>
  timing: ReturnType<typeof createTimingSensitivityTracker>
  checkpoint(reason: 'task-end' | 'script-end' | 'callback-end'): void
  runNotification(task: NonNullable<ReturnType<ReturnType<typeof createRejectionTracker>['peek']>>): void
  report(error: UncaughtError): void
}

/**
 * The event loop after the Script: picks and runs the next piece of work until none remains.
 * Candidates are a rejection notification Task, the oldest ready Task across sources (timers,
 * messages, network, cleanup; oldest enqueue wins, Host Profile chrome-155) and the rendering
 * step when animation-frame callbacks wait. Whatever is due first runs; the Virtual Clock jumps
 * forward when nothing is due yet.
 */
export function createTaskLoop(parts: TaskLoopParts) {
  const { ctx, engine, timers, hostTasks, frames, rejections, timing, checkpoint, runNotification, report } = parts
  const { clock, emit } = ctx

  const io = (args?: readonly number[]): InvokeIo => ({
    ...(args && { args }),
    report,
    between: () => checkpoint('callback-end'),
  })

  /** Moves the Virtual Clock to `us` while idle; due timers and delayed Tasks join their queues. */
  function advanceTo(us: number) {
    if (us > clock.nowUs) clock.nowUs = us
    ctx.meter.checkVirtualTime(clock.nowUs)
    clock.loc = undefined
    timers.queueDue(clock.nowUs)
    hostTasks.queueDue(clock.nowUs)
  }

  /** One Task: begin, its callback, end, then its Checkpoint. */
  function runTask(taskId: string, callback: CallbackHandle, cause: number | undefined, args?: readonly number[], before?: () => void) {
    emit({ k: 'task:begin', taskId }, HTML_LOOP, true, cause)
    before?.()
    const startUs = clock.nowUs
    engine.invokeCallback(callback, io(args))
    emit({ k: 'task:end', taskId }, HTML_LOOP)
    timers.resetNesting()
    checkpoint('task-end')
    timing.taskEnded(startUs, clock.nowUs, [...timers.pendingDueUs(), ...hostTasks.pendingDueUs()])
  }

  /** HTML update the rendering: each animation-frame callback runs as its own Task, in request order. */
  function runFrame(frameDueUs: number) {
    advanceTo(frameDueUs)
    const { frameMs, callbacks } = frames.takeFrame(clock.nowUs)
    emit({ k: 'render:frame', frameMs, callbacks: callbacks.length }, HTML_RENDERING)
    for (const entry of callbacks) {
      emit(
        {
          k: 'task:queue',
          taskId: entry.taskId,
          source: 'animation-frame',
          opId: entry.opId,
          ...(entry.handle.info && { callback: entry.handle.info }),
        },
        frames.ref,
      )
    }
    for (const entry of callbacks) {
      // An earlier callback of this frame may have cancelled this one.
      if (!frames.claim(entry)) continue
      runTask(entry.taskId, entry.handle, ctx.taskQueueSeq.get(entry.taskId), [frameMs])
    }
  }

  function drain() {
    for (;;) {
      const nextTimer = timers.next()
      const nextHost = hostTasks.peek()
      const useHost = nextHost !== undefined && (!nextTimer || enqueuedBefore(nextHost, nextTimer))
      const taskDueUs = useHost ? nextHost.dueUs : nextTimer?.dueUs
      const frameDueUs = frames.nextFrameDueUs(clock.nowUs)
      // Chrome runs a task that is already due before the notification Task; a later one waits.
      const notification = rejections.peek()
      if (
        notification &&
        (taskDueUs === undefined || taskDueUs > notification.dueUs) &&
        (frameDueUs === undefined || frameDueUs > notification.dueUs)
      ) {
        runNotification(rejections.dequeue()!)
        continue
      }
      timing.frameRace(frameDueUs, taskDueUs)
      if (frameDueUs !== undefined && (taskDueUs === undefined || frameDueUs < taskDueUs)) {
        runFrame(frameDueUs)
        continue
      }
      if (taskDueUs === undefined) break
      frames.idleUntil(taskDueUs)
      // The jump may make the chosen timer (and equal-delay siblings) due: queue them first.
      advanceTo(taskDueUs)
      if (useHost) {
        hostTasks.remove(nextHost)
        runTask(nextHost.taskId, nextHost.run, ctx.taskQueueSeq.get(nextHost.taskId))
      } else {
        const next = nextTimer!
        timers.fire(next)
        runTask(next.taskId, next.callback, next.initSeq, undefined, () => {
          emit({ k: 'timer:fire', tid: String(next.tid) }, HTML_TIMERS)
          if (next.repeat) timers.rearm(next)
        })
      }
    }
  }

  return { drain }
}
