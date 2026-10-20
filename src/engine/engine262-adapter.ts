// The only module that imports engine262 (ADR-0001, ADR-0005).
import * as E from '@engine262/engine262'
import type {
  CallbackHandle,
  CallOutcome,
  EngineAdapter,
  EngineHooks,
  FrameInfo,
  HostBindings,
  ScriptOutcome,
} from '../host/engine-adapter'
import type { JobKind } from '../trace/trace-event'
import { promiseJobDescriptor } from './promise-job-descriptor'
import { installUnsupportedApiStubs, unsupportedApiOf } from './unsupported-api-stubs'
import { installMessageChannel } from './message-channel-global'

type EngineValue = E.Value
type NativeSteps = Parameters<typeof E.CreateBuiltinFunction.from>[0]
type EngineJob = Parameters<InstanceType<typeof E.BasicJobQueue>['enqueuePromiseJob']>[0]
type EnginePromiseEvent = E.PromiseEvent
type EngineAwaitEvent = E.AwaitEvent
type NativeGenerator = (...args: EngineValue[]) => Generator<unknown, unknown, unknown>

/** The execution-context shape this adapter reads; engine262 does not export a precise type. */
interface Frame {
  Function: EngineValue
  callSite: { getFunctionName(): string | null; isNative(): boolean }
}

/** Fixed epoch so `Date.now()` is deterministic across Runs (2023-11-14T22:13:20Z). */
const VIRTUAL_EPOCH_MS = 1_700_000_000_000

/** Pinned engine262 build; keep in sync with package.json. */
export const ENGINE262_COMMIT = '2d7d8d988c77e94473ba0377122cdfccdfe243ba'

/** Revision of patches/@engine262__engine262.patch; bump when the patch changes. */
export const ENGINE262_PATCH = 'promise-events-2'

/**
 * Creates an engine262 realm driven by manual Job execution: Jobs run only when
 * the host performs a Checkpoint, never inside evaluate calls (ADR-0001).
 */
export function createEngine262Adapter(): EngineAdapter {
  let realm: InstanceType<typeof E.ManagedRealm>
  let hooks: EngineHooks
  /** >0 while the host itself calls into the engine (formatting values, ...): no events. */
  let hostDepth = 0
  let frameCounter = 0
  const frameIds = new WeakMap<object, FrameInfo>()
  const callbacks = new WeakMap<CallbackHandle, EngineValue>()
  let jobCounter = 0
  let promiseCounter = 0
  const promiseIds = new WeakMap<object, string>()
  /** Stable per-Run id of a promise; assigned on first sight. */
  const promiseId = (promise: object): string => {
    let id = promiseIds.get(promise)
    if (!id) promiseIds.set(promise, (id = `p${++promiseCounter}`))
    return id
  }
  const reportPromiseEvent = (event: EnginePromiseEvent) => {
    const pid = promiseId(event.promise)
    if (event.type === 'create') hooks.onPromiseEvent({ type: 'create', pid })
    else if (event.type === 'reaction') {
      hooks.onPromiseEvent({ type: 'reaction', pid, via: event.via, pending: event.pending })
    } else if (event.type === 'resolve') hooks.onPromiseEvent({ type: 'resolve', pid, with: event.with })
    else hooks.onPromiseEvent({ type: 'settle', pid, state: event.state })
  }
  const reportAwaitEvent = (event: EngineAwaitEvent) => {
    if (hostDepth) return
    const fid = frameInfo(event.context as unknown as Frame).frameId
    if (event.type === 'suspend') hooks.onAwaitEvent({ type: 'suspend', fid, awaitedPid: promiseId(event.promise) })
    else hooks.onAwaitEvent({ type: 'resume', fid, mode: event.mode })
  }
  const jobIds = new WeakMap<EngineJob, string>()

  /** FIFO microtask queue that tells the host about every Job as it is enqueued. */
  class ReportingJobQueue extends E.BasicJobQueue {
    enqueueTracked(job: EngineJob, jobKind: JobKind, pid?: string, outcome?: 'fulfill' | 'reject') {
      const jobId = `job-${++jobCounter}`
      jobIds.set(job, jobId)
      super.enqueuePromiseJob(job)
      hooks.onJobEnqueue(jobId, jobKind, pid, outcome)
    }
    override enqueuePromiseJob(job: EngineJob) {
      const d = promiseJobDescriptor(job, promiseId)
      this.enqueueTracked(job, d.jobKind, d.pid, d.outcome)
    }
  }
  const jobQueue = new ReportingJobQueue()

  const withHostContext = <T>(fn: () => T): T => {
    hostDepth++
    const pop = realm.pushTopContext()
    try {
      return fn()
    } finally {
      pop?.()
      hostDepth--
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

  /** Real function name; host built-ins carry it as a `name` property, not on the call site. */
  const frameLabel = (frame: Frame): { label: string; builtin: boolean } => {
    const fn = frame.Function
    if (!(fn instanceof E.ObjectValue)) return { label: 'script', builtin: false }
    const nameProp = fn.properties.get(E.Value('name'))
    const named = nameProp?.Value
    const label =
      named instanceof E.JSStringValue && named.stringValue()
        ? named.stringValue()
        : frame.callSite.getFunctionName() || '(anonymous)'
    return { label, builtin: frame.callSite.isNative() }
  }

  const frameInfo = (frame: Frame): FrameInfo => {
    let info = frameIds.get(frame)
    if (!info) {
      info = { frameId: `frame-${++frameCounter}`, ...frameLabel(frame) }
      frameIds.set(frame, info)
    }
    return info
  }

  const defineGlobal = (
    target: InstanceType<typeof E.ObjectValue>,
    name: string,
    steps: NativeGenerator,
  ) => {
    Object.defineProperty(steps, 'name', { value: name })
    target.properties.set(
      E.Value(name),
      E.Descriptor({
        Configurable: true,
        Enumerable: false,
        Writable: true,
        Value: E.CreateBuiltinFunction.from(steps as unknown as NativeSteps, name),
      }),
    )
  }

  const toDelayMs = (v: EngineValue | undefined) => {
    if (v === undefined) return 0
    const completion = E.skipDebugger(E.ToNumber(v))
    if (completion instanceof E.ThrowCompletion) return completion
    const n = E.R(E.ValueOfNormalCompletion(completion))
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  function installGlobals(bindings: HostBindings) {
    const global = realm.GlobalObject
    const timerFn = (repeat: boolean, name: string): NativeGenerator =>
      function* (callback, delay) {
        if (!E.isFunctionObject(callback ?? E.Value.undefined)) {
          return E.Throw.TypeError(`${name}: callback must be a function`)
        }
        const delayMs = toDelayMs(delay)
        if (delayMs instanceof E.ThrowCompletion) return delayMs
        const handle = { __callbackHandle: true } as const
        callbacks.set(handle, callback as EngineValue)
        return E.Value(bindings.setTimer(handle, delayMs, repeat))
      }
    const clearFn: NativeGenerator = function* (id) {
      if (id instanceof E.NumberValue) bindings.clearTimer(E.R(id))
      return E.Value.undefined
    }
    defineGlobal(global, 'setTimeout', timerFn(false, 'setTimeout'))
    defineGlobal(global, 'setInterval', timerFn(true, 'setInterval'))
    defineGlobal(global, 'clearTimeout', clearFn)
    defineGlobal(global, 'clearInterval', clearFn)

    defineGlobal(global, 'queueMicrotask', function* (callback) {
      if (!E.isFunctionObject(callback ?? E.Value.undefined)) {
        return E.Throw.TypeError('queueMicrotask: callback must be a function')
      }
      const fn = callback as EngineValue
      jobQueue.enqueueTracked(
        {
          queueName: 'PromiseJobs',
          job: (() => E.Call(fn, E.Value.undefined, [])) as unknown as EngineJob['job'],
          callerRealm: realm,
          callerScriptOrModule: null,
        } as EngineJob,
        'microtask',
      )
      return E.Value.undefined
    })

    installMessageChannel({
      realm,
      defineFunction: defineGlobal,
      enqueuePortMessage: bindings.enqueuePortMessage,
      registerCallback(fn) {
        const handle = { __callbackHandle: true } as const
        callbacks.set(handle, fn)
        return handle
      },
    })

    const consoleObject = E.OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%'])
    for (const level of ['log', 'info', 'warn', 'error'] as const) {
      defineGlobal(consoleObject, level, function* (...args) {
        bindings.writeConsole(level, args.map(format).join(' '))
        return E.Value.undefined
      })
    }
    const mathObject = global.properties.get(E.Value('Math'))?.Value
    if (mathObject instanceof E.ObjectValue) {
      defineGlobal(mathObject, 'random', function* () {
        return E.Value(bindings.random())
      })
    }
    // Wall-clock reads must come from the Virtual Clock so busy-waits terminate deterministically (ADR-0007).
    const dateConstructor = global.properties.get(E.Value('Date'))?.Value
    if (dateConstructor instanceof E.ObjectValue) {
      defineGlobal(dateConstructor, 'now', function* () {
        return E.Value(VIRTUAL_EPOCH_MS + Math.floor(bindings.virtualNowMs()))
      })
    }
    const performanceObject = E.OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%'])
    defineGlobal(performanceObject, 'now', function* () {
      return E.Value(bindings.virtualNowMs())
    })
    global.properties.set(
      E.Value('performance'),
      E.Descriptor({
        Configurable: true,
        Enumerable: false,
        Writable: true,
        Value: performanceObject,
      }),
    )
    global.properties.set(
      E.Value('console'),
      E.Descriptor({
        Configurable: true,
        Enumerable: false,
        Writable: true,
        Value: consoleObject,
      }),
    )
  }

  const runAsJob = (
    steps: () => unknown,
    onError: (message: string, unsupportedApi?: string) => void,
  ): void => {
    E.runSingleJobInQueue(
      { queueName: 'task', job: steps as unknown as () => ReturnType<typeof E.Call> & never, callerRealm: realm, callerScriptOrModule: null },
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
      hooks = engineHooks
      const agent = new E.Agent({
        eventLoopRunType: 'manual',
        hostHooks: {
          HostPromiseRejectionTrackers: new Set<E.HostPromiseRejectionTracker>([
            (promise, op) => {
              if (hostDepth) return
              hooks.onRejectionTrack(promiseId(promise), op, errorMessage(promise.PromiseResult ?? E.Value.undefined))
            },
          ]),
        },
        jobQueue,
        onPromiseEvent: reportPromiseEvent,
        onAwaitEvent: reportAwaitEvent,
        onNodeEvaluation(node) {
          if (hostDepth) return
          hooks.onNode({
            start: node.location.startIndex,
            end: node.location.endIndex,
            line: node.location.start.line,
            column: node.location.start.column,
          })
        },
      })
      E.setSurroundingAgent(agent)
      realm = new E.ManagedRealm({})

      // Frames: observe the agent's execution-context stack on this instance.
      const stack = agent.executionContextStack as unknown as {
        push(ctx: Frame): number
        pop(ctx: Frame): void
      }
      const originalPush = stack.push
      const originalPop = Object.getPrototypeOf(stack).pop as (ctx: Frame) => void
      stack.push = function (ctx) {
        const result = originalPush.call(this, ctx)
        if (!hostDepth) hooks.onFramePush(frameInfo(ctx))
        return result
      }
      stack.pop = function (ctx) {
        originalPop.call(this, ctx)
        if (!hostDepth) hooks.onFramePop(frameInfo(ctx))
      }

      withHostContext(() => {
        installGlobals(bindings)
        installUnsupportedApiStubs(realm)
      })
    },

    evaluateScript(source): ScriptOutcome {
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
      const completion = E.EnsureCompletion(realm.evaluateScriptSkipDebugger(E.ValueOfNormalCompletion(compiled)),
      )
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
      const job = jobQueue.shift()
      if (!job) return undefined
      const jobId = jobIds.get(job) ?? `job-${++jobCounter}`
      onBegin(jobId)
      E.runSingleJobInQueue(job, (error) => onUncaught(errorMessage(error), unsupportedApiOf(error)), () => {})
      return jobId
    },
  }
}
