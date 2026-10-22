import type { ReplayState } from '../../player/replay-state'

export interface ShelfTimerModel {
  /** Timer id, or the operation id of other Web API work. */
  tid: string
  /** When the Task becomes due on the Virtual Clock; `frame` / `…` when it waits on something else. */
  due: string
  repeat: boolean
  /** Top label of a block that is not a timer (`fetch`, `rAF`...). */
  name?: string
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

/** Short block labels for Web API work that is not a timer. */
const OP_NAME: Record<ReplayState['webOps'][number]['api'], string> = {
  requestAnimationFrame: 'rAF',
  fetch: 'fetch',
  body: 'body',
  import: 'import',
  waitAsync: 'wait',
}

/** What the timers part shows for one ReplayState: pure data, no geometry. */
export function timerShelfOf(state: ReplayState, capacity: number): TimerShelfModel {
  // Array.sort is stable, so equal due times keep the order the timers were armed in.
  const timers = [...state.timers]
    .sort((a, b) => a.dueUs - b.dueUs)
    .map((t): ShelfTimerModel => ({ tid: t.tid, due: formatVirtualMs(t.dueUs), repeat: t.repeat }))
  // Other Web API work waits on the same shelf, after the timers, in start order.
  const ops = state.webOps.map(
    (op): ShelfTimerModel => ({
      tid: op.opId,
      name: OP_NAME[op.api],
      due: op.dueUs !== undefined && op.dueUs > op.startUs ? formatVirtualMs(op.dueUs) : op.api === 'requestAnimationFrame' ? 'frame' : '…',
      repeat: false,
    }),
  )
  const ordered = [...timers, ...ops]
  return {
    clock: formatVirtualMs(state.clockUs),
    shown: ordered.slice(0, capacity),
    hidden: Math.max(0, ordered.length - capacity),
  }
}
