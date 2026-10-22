// The only module that imports engine262 (with its sibling files under src/engine).
import * as E from '@engine262/engine262'
import type { EngineAdapter, HostBindings, ScriptOutcome } from '../host/engine-adapter'
import type { FetchMock } from '../host/fetch-mock-directives'
import { installUnsupportedApiStubs } from './unsupported-api-stubs'
import type { EngineJob, EngineValue } from './engine262-types'
import { createEngineRunState, createHostCallHelpers } from './engine-run-state'
import { createCallbackDescriber } from './describe-callback'
import { createFrameTracker } from './frame-tracker'
import { createPromiseEventReporters } from './promise-event-reporters'
import { createReportingJobQueue } from './reporting-job-queue'
import { installRealmGlobals } from './realm-globals'
import { createHostCallbacks } from './host-callbacks'
import { createErrorReporting } from './error-event-reporting'
import { installWebPlatform } from './web-platform-globals'
import type { WebPlatform } from './web-platform-globals'
import { holdKeptObjectsUntilCheckpoint } from './gc-and-finalization'
import { PAGE_URL, createModuleLoader } from './module-loader'
import { evaluateEntryScript } from './entry-script'

/** Pinned engine262 build; keep in sync with package.json. */
export const ENGINE262_COMMIT = '2d7d8d988c77e94473ba0377122cdfccdfe243ba'

/** Revision of patches/@engine262__engine262.patch; bump when the patch changes. */
export const ENGINE262_PATCH = 'promise-events-4'

export interface Engine262AdapterOptions {
  /** The Script's `// @fetch` responses: the whole network a Run sees. */
  fetchMocks?: readonly FetchMock[]
}

/**
 * Creates an engine262 realm driven by manual Job execution: Jobs run only when the host performs
 * a Checkpoint, never inside evaluate calls.
 */
export function createEngine262Adapter(options: Engine262AdapterOptions = {}): EngineAdapter {
  const state = createEngineRunState()
  const { withHostContext, format, errorMessage } = createHostCallHelpers(state)
  const { frameInfo, observeStack } = createFrameTracker(state)
  const describe = createCallbackDescriber(state)
  const { promiseId, awaitSite, reportPromiseEvent, reportAwaitEvent, reportAsyncGeneratorEvent, markParked } =
    createPromiseEventReporters(state, frameInfo)
  let bindings: HostBindings
  let platform: WebPlatform | undefined
  let keptObjects: { clear(): void } | undefined
  /** Rejected promises by id: the notification Task fires its event with the promise itself. */
  const rejectedPromises = new Map<string, EngineValue>()

  const errors = createErrorReporting({
    state,
    global: () => state.realm.GlobalObject as never,
    events: () => platform!.events,
    targets: () => platform!.targets,
    errorMessage,
    withHostContext,
    runAsJob: (steps, onError) => callbacks.runAsJob(steps, onError),
  })
  const callbacks = createHostCallbacks(state, errors.reportError, withHostContext)
  const { jobQueue, jobIds, nextJobId } = createReportingJobQueue(state, promiseId, describe, awaitSite, (m) => {
    callbacks.markLive(bindings.liveCallbacks(), m)
    // Rejected promises are not roots: HTML holds reported ones in a weak set.
    modules.mark(m)
    markParked(m)
    platform?.markHostRoots(m)
  })
  const modules = createModuleLoader({
    state,
    get bindings() {
      return bindings
    },
    register: callbacks.register,
    reportError: (error, report) => errors.reportError(error, 'script', report),
  })

  return {
    start(hostBindings, engineHooks) {
      bindings = hostBindings
      state.hooks = engineHooks
      const agent = new E.Agent({
        eventLoopRunType: 'manual',
        hostHooks: {
          HostPromiseRejectionTrackers: new Set<E.HostPromiseRejectionTracker>([
            (promise, op) => {
              if (state.hostDepth) return
              const pid = promiseId(promise)
              rejectedPromises.set(pid, promise as unknown as EngineValue)
              state.hooks.onRejectionTrack(pid, op, errorMessage(promise.PromiseResult ?? E.Value.undefined))
              // Handled before any report: no event will ever need it.
              if (!state.hooks.rejectionStillTracked(pid)) rejectedPromises.delete(pid)
            },
          ]),
          HostEnqueueFinalizationRegistryCleanupJob: (registry: object) => platform?.enqueueFinalizationCleanup(registry),
          HostLoadImportedModule: modules.hostLoadImportedModule as never,
        } as never,
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
      keptObjects = holdKeptObjectsUntilCheckpoint(agent)
      // The global object carries a HostData slot so the window is an EventTarget like any other.
      state.realm = new E.ManagedRealm({ getImportMetaProperties: modules.importMetaProperties as never }, (realm) => [
        E.OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%'], ['HostData']) as never,
        undefined,
      ])
      observeStack(agent)

      withHostContext(() => {
        platform = installWebPlatform({
          state,
          bindings,
          fetchMocks: options.fetchMocks ?? [],
          describe,
          register: callbacks.register,
          reportError: errors.reportError,
          withHostContext,
          scriptRunning: () => state.scriptRunning,
        })
        installRealmGlobals(state, bindings, jobQueue, callbacks.register, format, describe)
        installUnsupportedApiStubs(state.realm)
      })
    },

    evaluateScript(source, report): ScriptOutcome {
      return evaluateEntryScript(state, source, {
        errorMessage,
        reportError: (error) => errors.reportError(error, 'script', report),
        evaluateModule: (record) => modules.evaluateModule(record, report),
        pageUrl: PAGE_URL,
      })
    },

    invokeCallback: callbacks.invoke,

    clearKeptObjects: () => keptObjects?.clear(),

    dispatchRejectionEvent(pid, type, io) {
      const promise = rejectedPromises.get(pid)
      if (type === 'rejectionhandled' || !state.hooks.rejectionStillTracked(pid)) rejectedPromises.delete(pid)
      if (!promise || !platform || platform.targets.listenersFor(state.realm.GlobalObject, type).length === 0) return
      const { events, dispatchFromLoop } = platform
      callbacks.run(
        {
          kind: 'steps',
          steps: (caller) => {
            const event = caller.inRealm(() =>
              events.create(events.PromiseRejectionEvent, type, { cancelable: type === 'unhandledrejection' }, {
                promise,
                reason: (promise as unknown as { PromiseResult?: EngineValue }).PromiseResult ?? E.Value.undefined,
              }),
            )
            dispatchFromLoop(state.realm.GlobalObject as never, event, caller)
          },
        },
        io,
      )
    },

    runNextJob(onBegin, report) {
      const job: EngineJob | undefined = jobQueue.shift()
      if (!job) return undefined
      const jobId = jobIds.get(job) ?? nextJobId()
      onBegin(jobId)
      E.runSingleJobInQueue(job, (error) => errors.reportError(error, 'microtask-callback', report), () => {})
      return jobId
    },
  }
}
