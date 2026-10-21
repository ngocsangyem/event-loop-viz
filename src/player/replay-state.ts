import type { ObservableOutput } from '../trace/observable-output'
import type { CallbackInfo, HaltReason, JobKind, SourceLocation, TraceEventBody } from '../trace/trace-event'
import type { RunningCallback } from './running-callback'

export interface StackFrame {
  frameId: string
  label: string
  builtin: boolean
}

export interface QueuedTask {
  taskId: string
  source: Extract<TraceEventBody, { k: 'task:queue' }>['source']
  dueUs?: number
  /** Set on a timer Task (schema v2): the timer it came from. */
  tid?: string
  /** The function the Task will call, when the Trace names it. */
  callback?: CallbackInfo
}

export interface QueuedJob {
  jobId: string
  jobKind: JobKind
  pid?: string
  outcome?: 'fulfill' | 'reject'
  callback?: CallbackInfo
}

export interface PendingTimer {
  tid: string
  requestedMs: number
  clampedMs: number
  repeat: boolean
  /** Virtual Clock time at which the timer's Task becomes due, microseconds. */
  dueUs: number
  /** Id of the Task this timer queues once due; the same id the callback chip keeps. */
  taskId?: string
  callback?: CallbackInfo
}

export type PromiseView = 'pending' | 'fulfilled' | 'rejected'

/**
 * An async function parked at an `await`: `fid` is the frame id it runs under (the same id
 * before and after the await), `pid` the promise it waits on when the Trace names one.
 */
export interface SuspendedAwait {
  fid: string
  /** Label of the function's frame; the frame id when its frame is not on the stack. */
  label: string
  pid?: string
}

/** Where an async generator is: handed a value out, running, or awaiting a `return()` value. */
export type AsyncGenView = 'yielded' | 'running' | 'awaiting-return'

/**
 * Everything the Scene and panels need at one position of a Trace (Glossary: Scene is a
 * pure function of position). Plain JSON-compatible data: snapshots are structured clones.
 */
export interface ReplayState {
  /** Index of the last event folded in. */
  position: number
  clockUs: number
  stack: StackFrame[]
  /** Task queue: queued, not yet begun. */
  tasks: QueuedTask[]
  currentTask: string | null
  /** Where the running Task came from; the queue entry is gone once it begins. */
  currentTaskSource: QueuedTask['source'] | null
  /** Microtask queue: Jobs enqueued, not yet begun. */
  jobs: QueuedJob[]
  currentJob: string | null
  /** What the running Job is; the queue entry is gone once it begins. */
  currentJobKind: JobKind | null
  /** Tick of the running Job (1 = enqueued by Script code); null outside Jobs. */
  tick: number | null
  inCheckpoint: boolean
  timers: PendingTimer[]
  promises: Record<string, PromiseView>
  suspendedAwaits: SuspendedAwait[]
  /** Async generators seen so far, by generator id. */
  asyncGens: Record<string, AsyncGenView>
  /** Observable Output so far (the console panel). */
  console: ObservableOutput
  /** Source range of the current event. */
  sourceRange: SourceLocation | null
  /** Source range of the event that scheduled the current one. */
  causeRange: SourceLocation | null
  halted: { reason: HaltReason; limit?: number } | null
  /** Tick assigned to each queued Job; consumed at job:begin. */
  jobTicks: Record<string, number>
  /**
   * The callback of the running Task or Job, once it has begun. The reducer replaces this
   * object on every change and never mutates it, because snapshots share the reference.
   */
  runningCallback: RunningCallback | null
}

export function createInitialState(): ReplayState {
  return {
    position: 0,
    clockUs: 0,
    stack: [],
    tasks: [],
    currentTask: null,
    currentTaskSource: null,
    jobs: [],
    currentJob: null,
    currentJobKind: null,
    tick: null,
    inCheckpoint: false,
    timers: [],
    promises: {},
    suspendedAwaits: [],
    asyncGens: {},
    console: [],
    sourceRange: null,
    causeRange: null,
    halted: null,
    jobTicks: {},
    runningCallback: null,
  }
}

/**
 * Copies a state for snapshots and seeks. Containers are copied, their entries are shared:
 * the reducer only pushes, filters and reassigns entries, never mutates one in place, and
 * `structuredClone` of a large console or promise table made Player construction quadratic.
 */
export function cloneReplayState(state: ReplayState): ReplayState {
  return {
    ...state,
    stack: state.stack.slice(),
    tasks: state.tasks.slice(),
    jobs: state.jobs.slice(),
    timers: state.timers.slice(),
    promises: { ...state.promises },
    suspendedAwaits: state.suspendedAwaits.slice(),
    asyncGens: { ...state.asyncGens },
    console: state.console.slice(),
    halted: state.halted && { ...state.halted },
    jobTicks: { ...state.jobTicks },
  }
}
