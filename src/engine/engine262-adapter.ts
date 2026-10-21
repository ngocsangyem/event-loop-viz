// The only module that imports engine262.
import * as E from '@engine262/engine262'
import type {
  CallbackHandle,
  CallOutcome,
  EngineAdapter,
  ScriptOutcome,
} from '../host/engine-adapter'
import { installUnsupportedApiStubs, unsupportedApiOf } from './unsupported-api-stubs'
import type { EngineJob, EngineValue } from './engine262-types'
import { createEngineRunState, createHostCallHelpers } from './engine-run-state'
import { createCallbackDescriber } from './describe-callback'
import { createFrameTracker } from './frame-tracker'
import { createPromiseEventReporters } from './promise-event-reporters'
import { createReportingJobQueue } from './reporting-job-queue'
import { installRealmGlobals } from './realm-globals'

/** Pinned engine262 build; keep in sync with package.json. */
export const ENGINE262_COMMIT = '2d7d8d988c77e94473ba0377122cdfccdfe243ba'

/** Revision of patches/@engine262__engine262.patch; bump when the patch changes. */
export const ENGINE262_PATCH = 'promise-events-4'

/**
 * Creates an engine262 realm driven by manual Job execution: Jobs run only when
 * the host performs a Checkpoint, never inside evaluate calls.
 */
export function createEngine262Adapter(): EngineAdapter {
  const state = createEngineRunState()
  const { withHostContext, format, errorMessage } = createHostCallHelpers(state)
  const { frameInfo, observeStack } = createFrameTracker(state)
  const describe = createCallbackDescriber(state)
  const { promiseId, awaitSite, reportPromiseEvent, reportAwaitEvent, reportAsyncGeneratorEvent } =
    createPromiseEventReporters(state, frameInfo)
  const { jobQueue, jobIds, nextJobId } = createReportingJobQueue(state, promiseId, describe, awaitSite)
  const callbacks = new WeakMap<CallbackHandle, EngineValue>()

  const runAsJob = (
    steps: () => unknown,
    onError: (message: string, unsupportedApi?: string) => void,
  ): void => {
    E.runSingleJobInQueue(
      { queueName: 'task', job: steps as unknown as () => ReturnType<typeof E.Call> & never, callerRealm: state.realm, callerScriptOrModule: null },
      (error) => onError(errorMessage(error), unsupportedApiOf(error)),
      () => {},
    )
  }

  const withUnsupportedApi = (outcome: { kind: 'threw'; message: string }, error: EngineValue): CallOutcome => {
    const unsupportedApi = unsupportedApiOf(error)
    return unsupportedApi ? { ...outcome, unsupportedApi } : outcome
  }

  return {
    start(bindings, engineHooks) {
      state.hooks = engineHooks
      const agent = new E.Agent({
        eventLoopRunType: 'manual',
        hostHooks: {
          HostPromiseRejectionTrackers: new Set<E.HostPromiseRejectionTracker>([
            (promise, op) => {
              if (state.hostDepth) return
              state.hooks.onRejectionTrack(promiseId(promise), op, errorMessage(promise.PromiseResult ?? E.Value.undefined))
            },
          ]),
        },
        jobQueue,
        onPromiseEvent: reportPromiseEvent,
        onAwaitEvent: reportAwaitEvent,
        onAsyncGeneratorEvent: reportAsyncGeneratorEvent,
        onNodeEvaluation(node) {
          if (state.hostDepth) return
          const loc = {
            start: node.location.startIndex,
            end: node.location.endIndex,
            line: node.location.start.line,
            column: node.location.start.column,
          }
          state.lastLoc = loc
          if (node.type === 'AwaitExpression') {
            const context = (agent as unknown as { runningExecutionContext: object }).runningExecutionContext
            const pending = state.pendingAwaits.get(context)
            if (pending) pending.push(loc)
            else state.pendingAwaits.set(context, [loc])
          }
          state.hooks.onNode(loc)
        },
      })
      E.setSurroundingAgent(agent)
      state.realm = new E.ManagedRealm({})
      observeStack(agent)

      withHostContext(() => {
        installRealmGlobals(state, bindings, jobQueue, callbacks, format, describe)
        installUnsupportedApiStubs(state.realm)
      })
    },

    evaluateScript(source): ScriptOutcome {
      const { realm } = state
      state.source = source
      const compiled = realm.compileScript(source, { specifier: 'user.js' })
      if (compiled instanceof E.ThrowCompletion) {
        const error = compiled.Value
        const site = (error as unknown as { HostDefinedStack?: { lineNumber: number; columnNumber: number }[] })
          .HostDefinedStack?.[0]
        return {
          kind: 'syntax-error',
          message: errorMessage(error).split('\n')[0] ?? 'SyntaxError',
          line: site?.lineNumber ?? 1,
          column: site?.columnNumber ?? 1,
        }
      }
      const script = E.ValueOfNormalCompletion(compiled)
      state.scriptRoot = (script as unknown as { ECMAScriptCode: object }).ECMAScriptCode
      const completion = E.EnsureCompletion(realm.evaluateScriptSkipDebugger(script))
      return completion instanceof E.ThrowCompletion
        ? withUnsupportedApi({ kind: 'threw', message: errorMessage(completion.Value) }, completion.Value)
        : { kind: 'ok' }
    },

    invokeCallback(callback): CallOutcome {
      const fn = callbacks.get(callback)
      if (!fn) throw new Error('unknown callback handle')
      let outcome: CallOutcome = { kind: 'ok' }
      runAsJob(
        () => E.Call(fn, E.Value.undefined, []),
        (message, unsupportedApi) =>
          (outcome = { kind: 'threw', message, ...(unsupportedApi && { unsupportedApi }) }),
      )
      return outcome
    },

    runNextJob(onBegin, onUncaught) {
      const job: EngineJob | undefined = jobQueue.shift()
      if (!job) return undefined
      const jobId = jobIds.get(job) ?? nextJobId()
      onBegin(jobId)
      E.runSingleJobInQueue(job, (error) => onUncaught(errorMessage(error), unsupportedApiOf(error)), () => {})
      return jobId
    },
  }
}
