import type { CallbackInfo, JobKind, PromiseReactionVia, SourceLocation } from '../trace/trace-event'

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
  | CallOutcome
  | { kind: 'syntax-error'; message: string; line: number; column: number }

/** Host-provided globals the engine exposes to the Script. */
export interface HostBindings {
  /** Returns the timer id handed to the Script. */
  setTimer(callback: CallbackHandle, delayMs: number, repeat: boolean): number
  clearTimer(id: number): void
  /**
   * A message was posted to a started MessagePort: queue a Task on the port-message source.
   * The host later calls `deliver` like any task callback.
   */
  enqueuePortMessage(deliver: CallbackHandle): void
  writeConsole(level: 'log' | 'info' | 'warn' | 'error', text: string): void
  /** Seeded source for `Math.random`, in [0, 1). */
  random(): number
  /** Virtual Clock reading in milliseconds since the Run began (fractional). */
  virtualNowMs(): number
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
}

export interface EngineAdapter {
  /** Creates the realm and installs the host-provided globals. */
  start(bindings: HostBindings, hooks: EngineHooks): void
  evaluateScript(source: string): ScriptOutcome
  invokeCallback(callback: CallbackHandle): CallOutcome
  /**
   * Runs the oldest queued Job and returns its id, or undefined when the queue is empty.
   * `onBegin` fires just before the Job's code runs. The host loops this to drain a Checkpoint.
   */
  runNextJob(onBegin: (jobId: string) => void, onUncaught: (message: string, unsupportedApi?: string) => void): string | undefined
}
