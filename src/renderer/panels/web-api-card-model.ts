import type { PendingWebOp, ReplayState } from '../../player/replay-state'
import type { CallbackInfo } from '../../trace/trace-event'
import { formatVirtualMs } from '../scene/timer-shelf-model'

/** Most cards drawn at once; the rest are summarised so many timers cannot make the panel endless. */
export const MAX_WEB_API_CARDS = 6

export interface WebApiCardModel {
  /** Card key and chip id: the Task the timer queues. A re-armed interval gets a new one. */
  key: string
  tid: string
  /** The Task the timer queues, once known; the id of its chip. */
  taskId: string | undefined
  api: 'setTimeout' | 'setInterval'
  /** The delay the host really uses, e.g. `4ms`. */
  delay: string
  requestedMs: number
  /** The page asked for less than the host waits (nesting clamp). */
  clamped: boolean
  /** Virtual time left, e.g. `3ms`. */
  left: string
  /** Due time on the Virtual Clock, for the tooltip. */
  due: string
  /** 0 when just armed, 1 when due. */
  progress: number
  repeat: boolean
  callback?: CallbackInfo
}

export interface WebApiCardsModel {
  cards: WebApiCardModel[]
  hidden: number
}

/** A Web API operation other than a timer: a fetch, a body read, an import, a rAF callback, a waitAsync. */
export interface WebOpCardModel {
  /** Card key and chip id: the Task it will queue, or the operation id when there is none. */
  key: string
  opId: string
  taskId: string | undefined
  api: PendingWebOp['api']
  detail?: string
  /** Virtual time left when it waits on the clock (network latency), e.g. `30ms`. */
  left?: string
  /** 0 when just started, 1 when due; only when it waits on the clock. */
  progress?: number
  callback?: CallbackInfo
}

/** The operation cards for one ReplayState, in start order; pure like the timer cards. */
export function webOpCardsOf(state: ReplayState, capacity = MAX_WEB_API_CARDS): { cards: WebOpCardModel[]; hidden: number } {
  const cards = state.webOps.slice(0, capacity).map((op): WebOpCardModel => {
    const timed = op.dueUs !== undefined && op.dueUs > op.startUs
    const remainingUs = timed ? Math.max(0, op.dueUs! - state.clockUs) : 0
    return {
      key: op.taskId ?? op.opId,
      opId: op.opId,
      taskId: op.taskId,
      api: op.api,
      ...(op.detail !== undefined && { detail: op.detail }),
      ...(timed && {
        left: formatVirtualMs(remainingUs),
        progress: Math.min(1, Math.max(0, 1 - remainingUs / (op.dueUs! - op.startUs))),
      }),
      ...(op.callback !== undefined && { callback: op.callback }),
    }
  })
  return { cards, hidden: Math.max(0, state.webOps.length - capacity) }
}

/** The cards for one ReplayState, soonest due first: pure, so scrubbing always shows the right countdown. */
export function webApiCardsOf(state: ReplayState, capacity = MAX_WEB_API_CARDS): WebApiCardsModel {
  // Array.sort is stable, so equal due times keep the order the timers were armed in.
  const ordered = [...state.timers].sort((a, b) => a.dueUs - b.dueUs)
  const cards = ordered.slice(0, capacity).map((timer): WebApiCardModel => {
    const totalUs = timer.clampedMs * 1000
    const remainingUs = Math.max(0, timer.dueUs - state.clockUs)
    const progress = totalUs > 0 ? Math.min(1, Math.max(0, 1 - remainingUs / totalUs)) : 1
    return {
      key: timer.taskId ?? timer.tid,
      tid: timer.tid,
      taskId: timer.taskId,
      api: timer.repeat ? 'setInterval' : 'setTimeout',
      delay: `${timer.clampedMs}ms`,
      requestedMs: timer.requestedMs,
      clamped: timer.clampedMs !== timer.requestedMs,
      left: formatVirtualMs(remainingUs),
      due: formatVirtualMs(timer.dueUs),
      progress,
      repeat: timer.repeat,
      callback: timer.callback,
    }
  })
  return { cards, hidden: Math.max(0, ordered.length - capacity) }
}
