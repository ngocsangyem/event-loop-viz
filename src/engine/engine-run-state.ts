import * as E from '@engine262/engine262'
import type { EngineHooks } from '../host/engine-adapter'
import type { SourceLocation } from '../trace/trace-event'
import type { EngineValue } from './engine262-types'

/**
 * Mutable state of one adapter instance. `realm` and `hooks` are assigned by `start()`,
 * before anything else in the adapter can run.
 */
export interface EngineRunState {
  realm: InstanceType<typeof E.ManagedRealm>
  hooks: EngineHooks
  /** >0 while the host itself calls into the engine (formatting values, ...): no events. */
  hostDepth: number
  /** The Script being run; function ranges in the Trace index into it. Unset before evaluateScript. */
  source: string | undefined
  /** The node evaluated last on behalf of the Script (not the host). */
  lastLoc: SourceLocation | undefined
  /** Root syntax node of the Script, to tell its functions from eval / `new Function` code. */
  scriptRoot: object | undefined
  /**
   * `await` expressions entered but not yet suspended, per async function context, innermost
   * last. `lastLoc` cannot say where an await is: by the time it suspends, the operand has run.
   */
  pendingAwaits: WeakMap<object, SourceLocation[]>
}

export function createEngineRunState(): EngineRunState {
  return {
    hostDepth: 0,
    source: undefined,
    lastLoc: undefined,
    scriptRoot: undefined,
    pendingAwaits: new WeakMap(),
  } as EngineRunState
}

/** Helpers for calls the host makes into the engine, which must not appear in the Trace. */
export function createHostCallHelpers(state: EngineRunState) {
  const withHostContext = <T>(fn: () => T): T => {
    state.hostDepth++
    const pop = state.realm.pushTopContext()
    try {
      return fn()
    } finally {
      pop?.()
      state.hostDepth--
    }
  }

  const format = (v: EngineValue): string =>
    withHostContext(() => (v instanceof E.JSStringValue ? v.stringValue() : E.inspect(v)))

  const errorMessage = (v: EngineValue): string =>
    withHostContext(() => {
      if (v instanceof E.ObjectValue) {
        const message = E.skipDebugger(E.Get(v, E.Value('message')))
        if (!(message instanceof E.ThrowCompletion)) {
          const value = E.ValueOfNormalCompletion(message)
          if (value instanceof E.JSStringValue) return value.stringValue()
        }
      }
      return format(v)
    })

  return { withHostContext, format, errorMessage }
}
