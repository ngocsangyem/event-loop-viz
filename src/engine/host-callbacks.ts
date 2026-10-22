import * as E from '@engine262/engine262'
import type { CallbackHandle, ExceptionOrigin, InvokeIo, UncaughtError } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { EngineValue } from './engine262-types'
import type { EngineRunState } from './engine-run-state'
import { Abrupt } from './web-idl-helpers'
import type { Markable } from './web-idl-helpers'
import { unsupportedApiOf } from './unsupported-api-stubs'
import { listenerCallSteps } from './event-target'

/**
 * What a Task callback does when the host invokes it:
 * - `call`: one Script function (a timer callback, an animation-frame callback).
 * - `steps`: host steps that may call several Script functions (the listeners of one event) or
 *   only engine internals (resolving a fetch promise). They get a `ScriptCaller`.
 */
export type Invocation =
  | { kind: 'call'; fn: EngineValue; thisArg: EngineValue; origin: ExceptionOrigin; args?: EngineValue[] }
  | { kind: 'steps'; steps: (caller: ScriptCaller) => void }

/** What host steps may do inside a Task. */
export interface ScriptCaller {
  /** Numbers the host passed (a frame timestamp). */
  args: readonly number[]
  /**
   * Calls a Script function from the event loop (empty stack). An exception is reported and the
   * `error` event fires; returns undefined then. A Checkpoint runs before the next call.
   */
  call(fn: EngineValue, thisArg: EngineValue, args: EngineValue[], origin: ExceptionOrigin, viaHandleEvent?: boolean): EngineValue | undefined
  /** Engine steps with no Script function of their own (resolve a promise, evaluate a module). */
  internal(steps: () => unknown, origin?: ExceptionOrigin): void
  /** Creates engine objects (an event) in the realm, as the host: no Trace events. */
  inRealm<T>(fn: () => T): T
}

/** Reports an uncaught exception value: the host emits the report, then the window fires `error`. */
export type ReportError = (error: EngineValue, origin: ExceptionOrigin, report: (e: UncaughtError) => void) => void

const isIterator = (value: unknown): value is Iterator<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as { next?: unknown }).next === 'function'

interface Entry {
  invocation: Invocation
  /** Engine values the Task needs later besides its function (a message, a promise to settle). */
  roots?: Markable
}

/**
 * Handles the host holds for Task callbacks, and how to run them. `runAsJob` gives each Script
 * call its own job context, the way HTML calls back into script from the event loop.
 */
export function createHostCallbacks(
  state: EngineRunState,
  reportError: ReportError,
  withHostContext: <T>(fn: () => T) => T,
) {
  const entries = new WeakMap<CallbackHandle, Entry>()

  /**
   * Runs `steps` as engine code on an empty stack, in a job context of the realm; a throw (an
   * engine ThrowCompletion, or Abrupt from native helpers) is passed to `onError`. `steps` may
   * return an engine evaluator, which is driven to the end.
   */
  const runAsJob = (steps: () => unknown, onError: (error: EngineValue) => void): void => {
    const job = function* (): Generator<unknown, unknown, unknown> {
      try {
        const result = steps()
        return isIterator(result) ? yield* result as Generator<unknown, unknown, unknown> : result
      } catch (error) {
        if (error instanceof Abrupt) return error.completion
        throw error
      }
    }
    E.runSingleJobInQueue(
      {
        queueName: 'task',
        job: job as unknown as () => ReturnType<typeof E.Call> & never,
        callerRealm: state.realm,
        callerScriptOrModule: null,
      },
      onError,
      () => {},
    )
  }

  function register(invocation: Invocation, info?: CallbackInfo, roots?: Markable): CallbackHandle {
    const handle = { __callbackHandle: true, ...(info && { info }) } as const
    entries.set(handle, { invocation, ...(roots && { roots }) })
    return handle
  }

  function invoke(handle: CallbackHandle, io: InvokeIo): void {
    const entry = entries.get(handle)
    if (!entry) throw new Error('unknown callback handle')
    run(entry.invocation, io)
  }

  /** Runs an invocation that has no handle (the steps of a rejection notification Task). */
  function run(invocation: Invocation, io: InvokeIo): void {
    const numbers = io.args ?? []
    if (invocation.kind === 'call') {
      const { fn, thisArg, origin, args = [] } = invocation
      runAsJob(
        () => E.Call(fn as never, thisArg as never, [...args, ...numbers.map((n) => E.Value(n))] as never),
        (error) => reportError(error, origin, io.report),
      )
      return
    }
    // A Checkpoint runs between two Script calls of one Task, never after the last: the Task's own
    // end-of-task Checkpoint follows it.
    let calledBefore = false
    invocation.steps({
      args: numbers,
      call(fn, thisArg, args, origin, viaHandleEvent = false) {
        if (calledBefore) io.between()
        calledBefore = true
        let result: EngineValue | undefined
        runAsJob(
          function* () {
            const completion = yield* listenerCallSteps(fn, thisArg, args, viaHandleEvent)
            if (!(completion instanceof E.ThrowCompletion)) result = E.EnsureCompletion(completion).Value as EngineValue
            return completion
          },
          (error) => reportError(error, origin, io.report),
        )
        return result
      },
      internal(steps, origin = 'task-callback') {
        runAsJob(steps, (error) => reportError(error, origin, io.report))
      },
      inRealm: withHostContext,
    })
  }

  /** Marks the engine values of handles the host still holds, for `gc()`. */
  function markLive(handles: Iterable<CallbackHandle>, mark: (value: unknown) => void) {
    for (const handle of handles) {
      const entry = entries.get(handle)
      if (!entry) continue
      if (entry.invocation.kind === 'call') {
        mark(entry.invocation.fn)
        mark(entry.invocation.thisArg)
        entry.invocation.args?.forEach(mark)
      }
      entry.roots?.mark(mark)
    }
  }

  return { register, invoke, run, markLive, runAsJob }
}

export type HostCallbacks = ReturnType<typeof createHostCallbacks>

/** The report the host emits for an exception value. */
export function uncaughtErrorOf(
  error: EngineValue,
  origin: ExceptionOrigin,
  errorMessage: (v: EngineValue) => string,
): UncaughtError {
  const unsupportedApi = unsupportedApiOf(error)
  return { origin, message: errorMessage(error), ...(unsupportedApi && { unsupportedApi }) }
}
