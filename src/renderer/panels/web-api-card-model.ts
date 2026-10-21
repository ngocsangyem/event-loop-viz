import type { ReplayState } from '../../player/replay-state'
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
