import type { TraceEvent } from '../../trace/trace-event'
import type { DriveTarget } from './drive-step'

/** What a narrated step says; its words come from `drive.narration.<kind>` with `params`. */
export type NarrationKind =
  | 'scriptStart'
  | 'call'
  | 'builtinCall'
  | 'console'
  | 'timer'
  | 'taskQueued'
  | 'jobQueued'
  | 'await'
  | 'rejected'
  | 'scriptEnd'
  | 'checkpoint'
  | 'checkpointEnd'
  | 'taskStart'
  | 'callbackStart'
  | 'builtinJob'
  | 'resume'
  | 'genResume'
  | 'genYield'
  | 'rejectionReport'
  | 'exception'
  | 'halt'

export type NarrationParams = Record<string, string | number>

/** One step of a walkthrough built from the Trace alone: every value in it is read from an event. */
export interface NarratedStep {
  position: number
  kind: NarrationKind
  /** A variant of the kind's words (`timer.clamped`, `jobQueued.await`, …), or the kind itself. */
  variant: string
  params: NarrationParams
  target: DriveTarget
  line?: number
  /** The Script line this step is about, lit next to the spot so the code stays in view. */
  code?: number
}

/** Steps whose `line` param names the code they are about: the call, the callback. */
const LINE_PARAM_KINDS: ReadonlySet<NarrationKind> = new Set(['builtinCall', 'call', 'callbackStart', 'taskQueued'])
/** Steps about the code that is running at their event: what printed, what was set or queued there. */
const RUNNING_CODE_KINDS: ReadonlySet<NarrationKind> = new Set(['console', 'timer', 'jobQueued', 'await', 'genYield', 'exception'])

export function codeLineOf(event: TraceEvent, kind: NarrationKind, params: NarrationParams, line: number | undefined): number | undefined {
  if (line !== undefined) return line
  if (LINE_PARAM_KINDS.has(kind) && typeof params.line === 'number') return params.line
  if (RUNNING_CODE_KINDS.has(kind)) return event.loc?.line
  return undefined
}
