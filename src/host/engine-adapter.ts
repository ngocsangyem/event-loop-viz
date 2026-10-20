import type { JobKind, SourceLocation } from '../trace/trace-event'

/**
 * Engine-neutral seam between the host and a JavaScript engine (ADR-0001, ADR-0005).
 * The host owns this interface; src/engine implements it. Nothing under src/host
 * may import engine types, so another engine can be dropped in.
 */

/** Opaque reference to a script function the host will call back later. */
export interface CallbackHandle {
  readonly __callbackHandle: true
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

/** Notifications the engine adapter sends to the host while it executes. */
export interface EngineHooks {
  /** One AST node was evaluated: the host advances the Virtual Clock. */
  onNode(loc: SourceLocation): void
  onFramePush(frame: FrameInfo): void
  onFramePop(frame: FrameInfo): void
  /** A Job joined the microtask queue (FIFO). */
  onJobEnqueue(jobId: string, kind: JobKind): void
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
