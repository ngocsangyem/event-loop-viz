import type { Trace } from '../trace/trace-event'
import { applyEvent } from './apply-event'
import { createInitialState } from './replay-state'
import type { ReplayState } from './replay-state'

/** A snapshot of the folded state is kept every this many events, so seeking replays at most this many. */
export const SNAPSHOT_INTERVAL = 500

export interface StepOptions {
  /** Step through Bookkeeping Events too. Default: Visible Events only. */
  showAll?: boolean
}

/**
 * Pure replay logic over one immutable Trace. Positions are event indexes (seq values).
 * Navigation methods take a position and return the new position; the caller owns the playhead.
 */
export interface Player {
  readonly eventCount: number
  /** State after folding events 0..position (clamped into range). A fresh object each call. */
  stateAt(position: number): ReplayState
  /** Step positions: Visible Events, or every event with `showAll`. Bookkeeping folds into the next one. */
  stepPositions(options?: StepOptions): readonly number[]
  first(options?: StepOptions): number
  last(options?: StepOptions): number
  /** Nearest step position at or after `position` (Bookkeeping Events fold forward). */
  seek(position: number, options?: StepOptions): number
  next(position: number, options?: StepOptions): number
  prev(position: number, options?: StepOptions): number
  /** Jump to the first Job of the next/previous Tick of a Checkpoint. Clamps at the Trace ends. */
  nextTick(position: number, options?: StepOptions): number
  prevTick(position: number, options?: StepOptions): number
  /** Jump to the next/previous Task start. Clamps at the Trace ends. */
  nextTask(position: number, options?: StepOptions): number
  prevTask(position: number, options?: StepOptions): number
}

// Array.prototype.findLast is outside the project's lib target.
function lastWhere<T>(items: readonly T[], test: (item: T) => boolean): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i]!)) return items[i]
  return undefined
}

export function createPlayer(trace: Trace): Player {
  const { events } = trace
  const eventAt = (seq: number) => events[seq]

  const snapshots: ReplayState[] = []
  const visible: number[] = []
  const all: number[] = []
  const taskStarts: number[] = []
  const tickStarts: number[] = []

  // One pass over the Trace builds snapshots and the navigation indexes together,
  // so the Tick rule lives only in applyEvent.
  const running = createInitialState()
  let lastTickInCheckpoint: number | null = null
  events.forEach((event, i) => {
    applyEvent(running, event, eventAt)
    if (i % SNAPSHOT_INTERVAL === 0) snapshots.push(structuredClone(running))
    all.push(i)
    if (event.visible) visible.push(i)
    if (event.k === 'task:begin') taskStarts.push(i)
    if (event.k === 'checkpoint:begin') lastTickInCheckpoint = null
    if (event.k === 'job:begin') {
      if (running.tick !== lastTickInCheckpoint) tickStarts.push(i)
      lastTickInCheckpoint = running.tick
    }
  })

  const lastIndex = events.length - 1
  const clamp = (n: number) => Math.min(Math.max(n, 0), Math.max(lastIndex, 0))

  function stateAt(position: number): ReplayState {
    if (events.length === 0) return createInitialState()
    const target = clamp(position)
    const base = Math.floor(target / SNAPSHOT_INTERVAL)
    const state = structuredClone(snapshots[base]!)
    for (let i = base * SNAPSHOT_INTERVAL + 1; i <= target; i++) {
      applyEvent(state, events[i]!, eventAt)
    }
    return state
  }

  // A Trace with no Visible Event would be unsteppable, so fall back to every event.
  const steps = (o?: StepOptions): readonly number[] =>
    o?.showAll || visible.length === 0 ? all : visible

  const seek = (position: number, o?: StepOptions) => {
    const s = steps(o)
    return s.find((p) => p >= position) ?? s[s.length - 1] ?? 0
  }
  const first = (o?: StepOptions) => steps(o)[0] ?? 0
  const last = (o?: StepOptions) => steps(o)[steps(o).length - 1] ?? 0
  const next = (position: number, o?: StepOptions) =>
    steps(o).find((p) => p > position) ?? Math.max(position, last(o))
  const prev = (position: number, o?: StepOptions) =>
    lastWhere(steps(o), (p) => p < position) ?? first(o)

  const nextBoundary = (boundaries: number[]) => (position: number, o?: StepOptions) => {
    const hit = boundaries.find((b) => b > position)
    return hit === undefined ? last(o) : seek(hit, o)
  }
  const prevBoundary = (boundaries: number[]) => (position: number, o?: StepOptions) => {
    // Compare after snapping, so a boundary folded forward onto the current step still counts as "here".
    const hit = lastWhere(boundaries, (b) => seek(b, o) < position)
    return hit === undefined ? first(o) : seek(hit, o)
  }

  return {
    eventCount: events.length,
    stateAt,
    stepPositions: steps,
    first,
    last,
    seek,
    next,
    prev,
    nextTick: nextBoundary(tickStarts),
    prevTick: prevBoundary(tickStarts),
    nextTask: nextBoundary(taskStarts),
    prevTask: prevBoundary(taskStarts),
  }
}
