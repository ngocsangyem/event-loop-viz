import type { CallbackHandle } from './engine-adapter'
import { HTML_TIMERS } from './host-spec-references'
import type { HostRunContext } from './host-run-context'

export interface PendingTimer {
  tid: number
  callback: CallbackHandle
  delayMs: number
  repeat: boolean
  taskId: string
  dueUs: number
  order: number
  nesting: number
  /** seq of this timer's timer:init event: the cause of its Task, whose code is the setTimeout call. */
  initSeq: number
  /** True once the Virtual Clock reached dueUs and the Task joined the Task Queue. */
  queued: boolean
}

/** Nesting level above which Chrome clamps timers to 4 ms (HTML timer initialization steps). */
const NESTING_CLAMP_LEVEL = 5
const NESTING_CLAMP_MIN_MS = 4

/**
 * Timer bookkeeping for the timer task source: init (with the nesting clamp), clear, and
 * choosing the next due timer. `nextOrder` is shared with port-message Tasks so ties across
 * sources break by host-wide enqueue order.
 */
export function createTimerScheduler(ctx: HostRunContext, nextOrder: () => number) {
  const timers = new Map<number, PendingTimer>()
  let timerCounter = 0
  let currentNesting = 0

  function init(callback: CallbackHandle, requestedMs: number, repeat: boolean, tid: number) {
    const clampedMs =
      currentNesting > NESTING_CLAMP_LEVEL && requestedMs < NESTING_CLAMP_MIN_MS
        ? NESTING_CLAMP_MIN_MS
        : requestedMs
    const nesting = currentNesting + 1
    const initSeq = ctx.events.length
    const taskId = ctx.newTaskId()
    ctx.emit(
      {
        k: 'timer:init',
        tid: String(tid),
        taskId,
        requestedMs,
        clampedMs,
        nesting,
        repeat,
        ...(callback.info && { callback: callback.info }),
      },
      HTML_TIMERS,
    )
    const timer: PendingTimer = {
      tid,
      callback,
      delayMs: requestedMs,
      repeat,
      taskId,
      dueUs: ctx.clock.nowUs + clampedMs * 1000,
      order: nextOrder(),
      nesting,
      initSeq,
      queued: false,
    }
    timers.set(tid, timer)
    refreshNextUnqueuedDue()
    return tid
  }

  /** Earliest dueUs among timers whose Task is not queued yet; cached so the per-node check is O(1). */
  let nextUnqueuedDueUs = Infinity
  function refreshNextUnqueuedDue() {
    nextUnqueuedDueUs = Infinity
    for (const t of timers.values()) if (!t.queued && t.dueUs < nextUnqueuedDueUs) nextUnqueuedDueUs = t.dueUs
  }

  return {
    /** The Script called setTimeout / setInterval. */
    set: (callback: CallbackHandle, delayMs: number, repeat: boolean) =>
      init(callback, delayMs, repeat, ++timerCounter),
    clear(id: number) {
      if (timers.delete(id)) {
        ctx.emit({ k: 'timer:clear', tid: String(id) }, HTML_TIMERS)
        refreshNextUnqueuedDue()
      }
    },
    /**
     * The Virtual Clock advanced: the timers that are now due queue their Task (HTML timer
     * initialization steps queue it only after the timeout elapsed), in (dueUs, arm order).
     */
    queueDue(nowUs: number) {
      if (nowUs < nextUnqueuedDueUs) return
      const due = [...timers.values()]
        .filter((t) => !t.queued && t.dueUs <= nowUs)
        .sort((a, b) => a.dueUs - b.dueUs || a.order - b.order)
      // The host does this at a clock tick, not as part of the node being evaluated, so the
      // event must not point at that node's source (it may be unrelated, e.g. a busy-wait loop).
      const savedLoc = ctx.clock.loc
      ctx.clock.loc = undefined
      try {
        for (const t of due) {
          t.queued = true
          ctx.emit(
            { k: 'task:queue', taskId: t.taskId, source: 'timer', dueUs: t.dueUs, tid: String(t.tid), ...(t.callback.info && { callback: t.callback.info }) },
            HTML_TIMERS,
            true,
            t.initSeq,
          )
        }
      } finally {
        ctx.clock.loc = savedLoc
        refreshNextUnqueuedDue()
      }
    },
    /** The timer due first; same-instant ties go to the earlier enqueue. */
    next: (): PendingTimer | undefined =>
      [...timers.values()].sort((a, b) => a.dueUs - b.dueUs || a.order - b.order)[0],
    /** Removes a timer about to fire and makes its nesting level the one new timers inherit. */
    fire(timer: PendingTimer) {
      timers.delete(timer.tid)
      refreshNextUnqueuedDue()
      currentNesting = timer.nesting
    },
    /** An interval re-arms before its callback runs (HTML timer task steps). */
    rearm: (timer: PendingTimer) => init(timer.callback, timer.delayMs, true, timer.tid),
    /** A Task ended: timers created from now on are not nested in a timer callback. */
    resetNesting() {
      currentNesting = 0
    },
    pendingDueUs: () => [...timers.values()].map((t) => t.dueUs),
  }
}
