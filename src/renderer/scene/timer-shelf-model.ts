import type { ReplayState } from '../../player/replay-state'

export interface ShelfTimerModel {
  tid: string
  /** When the timer's Task becomes due on the Virtual Clock. */
  due: string
  repeat: boolean
}

export interface TimerShelfModel {
  /** The Virtual Clock reading. */
  clock: string
  /** The soonest-due timers that fit on the shelf, soonest first. */
  shown: ShelfTimerModel[]
  /** Pending timers beyond the shelf's capacity. */
  hidden: number
}

/** Virtual Clock microseconds as milliseconds with at most one decimal: `12.5ms`. */
export function formatVirtualMs(us: number): string {
  return `${Math.round(us / 100) / 10}ms`
}

/** What the timers part shows for one ReplayState: pure data, no geometry. */
export function timerShelfOf(state: ReplayState, capacity: number): TimerShelfModel {
  // Array.sort is stable, so equal due times keep the order the timers were armed in.
  const ordered = [...state.timers].sort((a, b) => a.dueUs - b.dueUs)
  const shown = ordered
    .slice(0, capacity)
    .map((t): ShelfTimerModel => ({ tid: t.tid, due: formatVirtualMs(t.dueUs), repeat: t.repeat }))
  return {
    clock: formatVirtualMs(state.clockUs),
    shown,
    hidden: Math.max(0, ordered.length - capacity),
  }
}
