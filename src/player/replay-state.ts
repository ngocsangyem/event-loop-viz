import type { ObservableOutput } from '../trace/observable-output'
import type {
  HaltReason,
  JobKind,
  SourceLocation,
  TraceEventBody,
} from '../trace/trace-event'

export interface StackFrame {
  frameId: string
  label: string
  builtin: boolean
}

export interface QueuedTask {
  taskId: string
  source: Extract<TraceEventBody, { k: 'task:queue' }>['source']
  dueUs?: number
}

export interface QueuedJob {
  jobId: string
  jobKind: JobKind
  pid?: string
  outcome?: 'fulfill' | 'reject'
}

export interface PendingTimer {
  tid: string
  requestedMs: number
  clampedMs: number
  repeat: boolean
  /** Virtual Clock time at which the timer's Task becomes due, microseconds. */
  dueUs: number
}

export type PromiseView = 'pending' | 'fulfilled' | 'rejected'

/**
 * An `await` whose async function is parked until a promise settles. Nothing in the
 * current Trace schema marks suspension, so this stays empty until await events exist.
 */
export interface SuspendedAwait {
  pid: string
}

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
  /** Observable Output so far (the console panel). */
  console: ObservableOutput
  /** Source range of the current event. */
  sourceRange: SourceLocation | null
  /** Source range of the event that scheduled the current one. */
  causeRange: SourceLocation | null
  halted: { reason: HaltReason; limit?: number } | null
  /** Tick assigned to each queued Job; consumed at job:begin. */
  jobTicks: Record<string, number>
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
    console: [],
    sourceRange: null,
    causeRange: null,
    halted: null,
    jobTicks: {},
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
    console: state.console.slice(),
    halted: state.halted && { ...state.halted },
    jobTicks: { ...state.jobTicks },
  }
}
