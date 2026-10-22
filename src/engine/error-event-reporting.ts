// HTML "report the exception": the host records the report, then `error` fires at the window.
import * as E from '@engine262/engine262'
import type { ExceptionOrigin, UncaughtError } from '../host/engine-adapter'
import type { EngineValue } from './engine262-types'
import type { EngineRunState } from './engine-run-state'
import type { EventInterfaces } from './event-objects'
import { listenerCallSteps } from './event-target'
import type { EventTargets } from './event-target'
import { uncaughtErrorOf } from './host-callbacks'
import { Abrupt, num, run, str } from './web-idl-helpers'
import type { ObjectValue } from './web-idl-helpers'

export interface ErrorReportingDeps {
  state: EngineRunState
  /** The window; the realm exists only once the adapter started. */
  global(): ObjectValue
  events: () => EventInterfaces
  targets: () => EventTargets
  errorMessage(value: EngineValue): string
  withHostContext<T>(fn: () => T): T
  /** Runs `steps` on an empty stack (a fresh job context). */
  runAsJob(steps: () => unknown, onError: (error: EngineValue) => void): void
}

/**
 * Builds `reportError(value, origin, report)`. `error` listeners run right after the report, with
 * no Checkpoint between them (Chrome 155: E1, E2, then E1's microtask). An exception thrown by an
 * `error` listener is reported but fires no further `error` event (HTML error reporting mode).
 */
export function createErrorReporting(deps: ErrorReportingDeps) {
  let firing = false

  /** `Uncaught Error: boom` for an error object, `Uncaught str` for anything else. */
  const eventMessage = (error: EngineValue) =>
    deps.withHostContext(() => {
      if (error instanceof E.ObjectValue && 'ErrorData' in error) {
        const name = run<EngineValue>(E.Get(error as never, E.Value('name')))
        const message = deps.errorMessage(error)
        const n = name instanceof E.JSStringValue ? name.stringValue() : 'Error'
        return `Uncaught ${message ? `${n}: ${message}` : n}`
      }
      return `Uncaught ${deps.errorMessage(error)}`
    })

  function reportError(error: EngineValue, origin: ExceptionOrigin, report: (e: UncaughtError) => void) {
    report(uncaughtErrorOf(error, origin, deps.errorMessage))
    // Nothing listens: no event object, no job context, nothing in the Trace.
    if (firing || deps.targets().listenersFor(deps.global(), 'error').length === 0) return
    const loc = deps.state.lastLoc
    const message = eventMessage(error)
    const createEvent = () => {
      const events = deps.events()
      return events.create(events.ErrorEvent, 'error', { cancelable: true }, {
        message: str(message),
        filename: str(''),
        lineno: num(loc?.line ?? 0),
        colno: num(loc?.column ?? 0),
        error,
      })
    }
    const callListener = (fn: EngineValue, thisArg: EngineValue, args: EngineValue[], viaHandleEvent = false) => {
      try {
        return run<EngineValue>(listenerCallSteps(fn, thisArg, args, viaHandleEvent))
      } catch (thrown) {
        if (!(thrown instanceof Abrupt)) throw thrown
        report(uncaughtErrorOf(thrown.completion.Value as EngineValue, 'event-listener', deps.errorMessage))
        return undefined
      }
    }
    const reportListenerError = (value: EngineValue) => report(uncaughtErrorOf(value, 'event-listener', deps.errorMessage))
    firing = true
    try {
      const dispatch = () => deps.targets().dispatch(deps.global(), createEvent(), callListener)
      // From the event loop the stack is empty and listeners need a job context of their own;
      // from inside dispatchEvent they run nested on the current stack.
      if ((E.surroundingAgent.executionContextStack as unknown as unknown[]).length === 0) {
        deps.runAsJob(() => {
          dispatch()
          return E.Value.undefined
        }, reportListenerError)
      } else {
        dispatch()
      }
    } finally {
      firing = false
    }
  }

  return { reportError }
}
