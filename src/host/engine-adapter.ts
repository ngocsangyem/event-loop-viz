import type {
  CallbackInfo,
  JobKind,
  PromiseReactionVia,
  SourceLocation,
  TaskSource,
  WebApiKind,
} from '../trace/trace-event'

/**
 * Engine-neutral seam between the host and a JavaScript engine.
 * The host owns this interface; src/engine implements it. Nothing under src/host
 * may import engine types, so another engine can be dropped in.
 */

/** Opaque reference to a script function the host will call back later. */
export interface CallbackHandle {
  readonly __callbackHandle: true
  /** What the handle will call, for display; absent when the engine cannot describe it. */
  readonly info?: CallbackInfo
}

/** `unsupportedApi` names the Unsupported API when the error is an UnsupportedApiError. */
export type CallOutcome =
  | { kind: 'ok' }
  | { kind: 'threw'; message: string; unsupportedApi?: string }

export type ScriptOutcome =
  | (CallOutcome & { sourceType: 'script' | 'module' })
  | { kind: 'syntax-error'; message: string; line: number; column: number }

/** Where an exception the host reports came from (HTML report the exception). */
export type ExceptionOrigin = 'script' | 'task-callback' | 'microtask-callback' | 'event-listener'

/** An uncaught exception, with the Unsupported API it names when it is an UnsupportedApiError. */
export interface UncaughtError {
  origin: ExceptionOrigin
  message: string
  unsupportedApi?: string
}

/**
 * What the host hands `invokeCallback`. One Task callback may call several script functions
 * (the listeners of one event): `between` runs after each but the last (HTML clean up after
 * running a callback performs a Checkpoint), and every exception is reported, not just the first.
 */
export interface InvokeIo {
  /** Numbers passed to the callback after any arguments it was registered with (a frame timestamp). */
  args?: readonly number[]
  report(error: UncaughtError): void
  between(): void
}

/** Options for `queueTask`. */
export interface QueueTaskOptions {
  /** The Task joins its queue only once the Virtual Clock has advanced this far (network latency). */
  delayMs?: number
  /** The Web API operation the Task completes (its card leaves Web APIs). */
  opId?: string
  /** Id reserved by `startWebApi`, so the card and the queued Task share a chip. */
  taskId?: string
  /** What the Task calls, when it is not the callback the handle describes. */
  callback?: CallbackInfo
}

/** Host-provided globals the engine exposes to the Script. */
export interface HostBindings {
  /** Returns the timer id handed to the Script. */
  setTimer(callback: CallbackHandle, delayMs: number, repeat: boolean): number
  clearTimer(id: number): void
  /**
   * Queues a Task on `source` that calls `run` (a posted message, a network response, a cleanup).
   * Ready Tasks of every source and due timers run oldest-enqueue first. Returns the Task id.
   */
  queueTask(source: TaskSource, run: CallbackHandle, options?: QueueTaskOptions): string
  /** A Web API operation started; its card shows until a Task with its `opId` is queued. */
  startWebApi(op: { api: WebApiKind; callback?: CallbackInfo; detail?: string; delayMs?: number }): {
    opId: string
    taskId: string
  }
  /** `requestAnimationFrame`: the callback runs at the next rendering opportunity. Returns its id. */
  requestAnimationFrame(callback: CallbackHandle): number
  cancelAnimationFrame(id: number): void
  /** An exception the engine caught itself (a listener inside dispatchEvent, a failed module). */
  reportException(error: UncaughtError): void
  writeConsole(level: 'log' | 'info' | 'warn' | 'error', text: string): void
  /** Seeded source for `Math.random`, in [0, 1). */
  random(): number
  /** Virtual Clock reading in milliseconds since the Run began (fractional). */
  virtualNowMs(): number
  /** Callbacks the host still holds (pending timers, queued Tasks, animation-frame callbacks): GC roots for `gc()`. */
  liveCallbacks(): Iterable<CallbackHandle>
}

export interface FrameInfo {
  frameId: string
  label: string
  builtin: boolean
}

/** A promise lifecycle step; `pid` is stable for the life of a Run. */
export type PromiseEventInfo =
  | { type: 'create'; pid: string }
  | { type: 'reaction'; pid: string; via: PromiseReactionVia; pending: boolean }
  | { type: 'resolve'; pid: string; with: 'value' | 'thenable' | 'self' }
  | { type: 'settle'; pid: string; state: 'fulfilled' | 'rejected' }

/** An async function parking at an await, or continuing after it; `fid` is its frame id. */
export type AwaitEventInfo =
  | { type: 'suspend'; fid: string; awaitedPid: string }
  | { type: 'resume'; fid: string; mode: 'next' | 'throw' }

/** An async generator yielding, continuing or awaiting a return value; `gid` is stable per generator object. */
export type AsyncGeneratorEventInfo = { type: 'yield' | 'resume' | 'return-await'; gid: string }

/** Notifications the engine adapter sends to the host while it executes. */
export interface EngineHooks {
  /** One AST node was evaluated: the host advances the Virtual Clock. */
  onNode(loc: SourceLocation): void
  onFramePush(frame: FrameInfo): void
  onFramePop(frame: FrameInfo): void
  onPromiseEvent(event: PromiseEventInfo): void
  onAwaitEvent(event: AwaitEventInfo): void
  onAsyncGeneratorEvent(event: AsyncGeneratorEventInfo): void
  /**
   * A Job joined the microtask queue (FIFO). Promise Jobs name their target promise;
   * the engine reports the promise event that scheduled the Job just before this call.
   */
  onJobEnqueue(job: {
    jobId: string
    jobKind: JobKind
    pid?: string
    outcome?: 'fulfill' | 'reject'
    callback?: CallbackInfo
  }): void
  /**
   * HostPromiseRejectionTracker: `pid` identifies the promise, `message` is its
   * rejection reason formatted for display.
   */
  onRejectionTrack(pid: string, op: 'reject' | 'handle', message: string): void
  /**
   * True while the promise `pid` may still get a notification event (unhandledrejection queued
   * or about to be, or rejectionhandled after an earlier report); the engine may let go otherwise.
   */
  rejectionStillTracked(pid: string): boolean
}

export interface EngineAdapter {
  /** Creates the realm and installs the host-provided globals. */
  start(bindings: HostBindings, hooks: EngineHooks): void
  /**
   * Runs the Script as a classic script, or as a module when only a module parse accepts it.
   * An uncaught exception goes to `report` (then the `error` event fires at the window).
   */
  evaluateScript(source: string, report: (error: UncaughtError) => void): ScriptOutcome
  /** Runs a Task callback; exceptions go to `io.report`, Checkpoints between listeners to `io.between`. */
  invokeCallback(callback: CallbackHandle, io: InvokeIo): void
  /** HTML perform a microtask checkpoint, last step: ClearKeptObjects (WeakRef targets kept since the last one). */
  clearKeptObjects(): void
  /**
   * Fires `unhandledrejection` / `rejectionhandled` at the window for the promise `pid`, inside the
   * notification Task (listeners run with a Checkpoint between them).
   */
  dispatchRejectionEvent(pid: string, type: 'unhandledrejection' | 'rejectionhandled', io: InvokeIo): void
  /**
   * Runs the oldest queued Job and returns its id, or undefined when the queue is empty.
   * `onBegin` fires just before the Job's code runs. The host loops this to drain a Checkpoint.
   */
  runNextJob(onBegin: (jobId: string) => void, report: (error: UncaughtError) => void): string | undefined
}
