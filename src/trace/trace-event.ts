/**
 * Trace schema v1: the only contract between execution and presentation.
 * Events are frozen, JSON-serializable and contain no engine objects.
 */

export const TRACE_SCHEMA_VERSION = 1

export interface TraceBudgets {
  nodes: number
  tasks: number
  virtualMs: number
  events: number
}

export interface TraceHeader {
  schemaVersion: typeof TRACE_SCHEMA_VERSION
  engine: { name: 'engine262'; commit: string; patch: string }
  hostProfile: 'chrome-155'
  budgets: TraceBudgets
  /** Virtual Clock cost per evaluated node, in microseconds. */
  nodeCostUs: number
  randomSeed: number
  /** The Script. */
  source: string
  unsupportedApis: string[]
  timingSensitive: boolean
}

export interface SourceLocation {
  start: number
  end: number
  line: number
  column: number
}

interface EventBase {
  /** Dense, 0..n-1. */
  seq: number
  /** Virtual Clock, microseconds. */
  t: number
  /** Spec step this event implements. */
  ref: `ES:${string}` | `HTML:${string}`
  /** Source being evaluated at that moment. */
  loc?: SourceLocation
  /** seq of the event that scheduled this one. */
  cause?: number
  /** false = Bookkeeping Event. */
  visible: boolean
}

/** What a Job does: run a promise reaction, call a thenable's `then`, or run a queueMicrotask callback. */
export type JobKind = 'reaction' | 'thenable' | 'microtask'

export type PromiseReactionVia = 'then' | 'await' | 'asyncgen' | 'from-sync'

export type HaltReason = 'natural' | 'nodes' | 'tasks' | 'virtual-time' | 'events'

export type TraceEventBody =
  | { k: 'run:start' }
  | { k: 'run:halted'; reason: HaltReason; limit?: number }
  | {
      k: 'task:queue'
      taskId: string
      source: 'script' | 'timer' | 'port-message' | 'dom-manipulation'
      dueUs?: number
    }
  | { k: 'task:begin' | 'task:end'; taskId: string }
  | { k: 'checkpoint:begin' | 'checkpoint:end'; reason: 'task-end' | 'script-end' | 'callback-end' }
  | {
      k: 'job:enqueue'
      jobId: string
      jobKind: JobKind
      /** Target promise: the one whose reaction runs, or the one a thenable Job resolves. */
      pid?: string
      /** Which reaction a `reaction` Job runs. */
      outcome?: 'fulfill' | 'reject'
    }
  | { k: 'job:begin' | 'job:end'; jobId: string }
  | { k: 'frame:push'; frameId: string; label: string; builtin: boolean }
  | { k: 'frame:pop'; frameId: string; label: string; builtin: boolean }
  | {
      k: 'timer:init'
      tid: string
      requestedMs: number
      clampedMs: number
      nesting: number
      repeat: boolean
    }
  | { k: 'promise:create'; pid: string }
  | { k: 'promise:reaction'; pid: string; via: PromiseReactionVia; pending: boolean }
  | { k: 'promise:resolve'; pid: string; with: 'value' | 'thenable' | 'self' }
  | { k: 'promise:settle'; pid: string; state: 'fulfilled' | 'rejected' }
  /** An async function parks at an await (`fid` = its frame id) / continues once the awaited promise settles. */
  | { k: 'await:suspend' | 'await:resume'; fid: string; awaitedPid?: string; mode?: 'next' | 'throw' }
  /**
   * An async generator (`gid`) hands a value to its consumer, continues for the next request,
   * or awaits the value of a `return()` request. Distinct from the generator's own awaits.
   */
  | { k: 'asyncgen:yield' | 'asyncgen:resume' | 'asyncgen:return-await'; gid: string }
  | { k: 'timer:fire' | 'timer:clear'; tid: string }
  | { k: 'rejection:track'; pid: string; op: 'reject' | 'handle' }
  /** A queued notification Task fired: `unhandled` (unhandledrejection) or `handled` (rejectionhandled). */
  | { k: 'rejection:notify'; pid: string; outcome: 'unhandled' | 'handled'; message: string }
  | {
      k: 'exception:report'
      origin: 'script' | 'task-callback' | 'microtask-callback'
      message: string
      /** Set when the exception is an UnsupportedApiError; names the API. */
      unsupportedApi?: string
    }
  | { k: 'console'; level: 'log' | 'info' | 'warn' | 'error'; text: string }

export type TraceEvent = EventBase & TraceEventBody

export interface Trace {
  header: TraceHeader
  events: TraceEvent[]
}
