import type { SourceLocation } from '../trace/trace-event'

/**
 * Engine-neutral seam between the host and a JavaScript engine (ADR-0001, ADR-0005).
 * The host owns this interface; src/engine implements it. Nothing under src/host
 * may import engine types, so another engine can be dropped in.
 */

/** Opaque reference to a script function the host will call back later. */
export interface CallbackHandle {
  readonly __callbackHandle: true
}

export type CallOutcome = { kind: 'ok' } | { kind: 'threw'; message: string }

export type ScriptOutcome =
  | CallOutcome
  | { kind: 'syntax-error'; message: string; line: number; column: number }

/** Host-provided globals the engine exposes to the Script. */
export interface HostBindings {
  /** Returns the timer id handed to the Script. */
  setTimer(callback: CallbackHandle, delayMs: number, repeat: boolean): number
  clearTimer(id: number): void
  writeConsole(level: 'log' | 'info' | 'warn' | 'error', text: string): void
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
}

export interface EngineAdapter {
  /** Creates the realm and installs the host-provided globals. */
  start(bindings: HostBindings, hooks: EngineHooks): void
  evaluateScript(source: string): ScriptOutcome
  invokeCallback(callback: CallbackHandle): CallOutcome
  /** Runs queued Jobs until the microtask queue is empty. */
  drainMicrotasks(onUncaught: (message: string) => void): void
}
