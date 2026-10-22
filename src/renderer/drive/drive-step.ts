import type { TraceEvent } from '../../trace/trace-event'

/**
 * The regions a Drive me step can spotlight. Each one is an element carrying the matching
 * `data-drive-target` attribute; `source` is the Script / Source pane, narrowed to one line
 * when the step names it.
 */
export const DRIVE_TARGETS = [
  'source',
  'call-stack',
  'web-apis',
  'task-queue',
  'microtask-queue',
  'event-loop',
  'console',
] as const

export type DriveTarget = (typeof DRIVE_TARGETS)[number]

export const isDriveTarget = (value: unknown): value is DriveTarget =>
  typeof value === 'string' && (DRIVE_TARGETS as readonly string[]).includes(value)

/**
 * Which Trace Event a step stands on. Matching by kind (and console text) rather than by
 * position keeps a hand-written step valid when the engine emits more or fewer events.
 */
export interface EventMatcher {
  k: TraceEvent['k']
  /** For `console` events: the exact printed text. */
  text?: string
  /** Fields the event must carry with exactly these values, e.g. `{ label: 'step' }` on a `frame:push`. */
  where?: Readonly<Record<string, string | number | boolean>>
  /** Only events after the one this matcher names count, e.g. the first frame pushed after a `job:begin`. */
  after?: EventMatcher
  /** 1-based: the nth matching event (after `after`, when given). Defaults to the first. */
  nth?: number
}

/** Where the spotlight goes: a region, and for `source` optionally one line of the Script. */
export interface DriveSpot {
  target: DriveTarget
  /** 1-based Script line; only read for the `source` target. */
  line?: number
}

/** One step of a walkthrough, as written by hand or produced by the AI. */
export interface DriveStep extends DriveSpot {
  at: EventMatcher
  title: string
  body: string
}

/** A step placed on the replay: the position (event seq) it moves the playhead to. */
export interface ResolvedDriveStep extends DriveSpot {
  position: number
  title: string
  body: string
}
