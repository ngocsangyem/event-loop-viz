import * as E from '@engine262/engine262'
import type { CallbackHandle, HostBindings } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { EngineJob, EngineValue, NativeGenerator, NativeSteps } from './engine262-types'
import type { EngineRunState } from './engine-run-state'
import type { DescribeCallback } from './describe-callback'
import type { ReportingJobQueue } from './reporting-job-queue'
import type { Invocation } from './host-callbacks'

/** Fixed epoch so `Date.now()` is deterministic across Runs (2023-11-14T22:13:20Z). */
const VIRTUAL_EPOCH_MS = 1_700_000_000_000

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

const defineValue = (target: InstanceType<typeof E.ObjectValue>, name: string, value: EngineValue) =>
  target.properties.set(
    E.Value(name),
    E.Descriptor({ Configurable: true, Enumerable: false, Writable: true, Value: value }),
  )

const toDelayMs = (v: EngineValue | undefined) => {
  if (v === undefined) return 0
  const completion = E.skipDebugger(E.ToNumber(v))
  if (completion instanceof E.ThrowCompletion) return completion
  const n = E.R(E.ValueOfNormalCompletion(completion))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Installs the host-provided globals: timers, queueMicrotask, console, a seeded Math.random and
 * Virtual Clock backed Date.now / performance.now. `register` turns a Script function into a
 * handle the host can call back as a Task.
 */
export function installRealmGlobals(
  state: EngineRunState,
  bindings: HostBindings,
  jobQueue: ReportingJobQueue,
  register: (invocation: Invocation, info?: CallbackInfo) => CallbackHandle,
  format: (v: EngineValue) => string,
  describe: DescribeCallback,
) {
  const { realm } = state
  const global = realm.GlobalObject
  // HTML timer initialization steps: the callback runs with the window as `this` and the
  // arguments after the delay.
  const timerFn = (repeat: boolean, name: string): NativeGenerator =>
    function* (callback, delay, ...args) {
      if (!E.isFunctionObject(callback ?? E.Value.undefined)) {
        return E.Throw.TypeError(`${name}: callback must be a function`)
      }
      const delayMs = toDelayMs(delay)
      if (delayMs instanceof E.ThrowCompletion) return delayMs
      const handle = register(
        { kind: 'call', fn: callback as EngineValue, thisArg: global, origin: 'task-callback', args },
        describe(callback),
      )
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
      { jobKind: 'microtask', callback: describe(fn) },
      [fn],
    )
    return E.Value.undefined
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
  // Wall-clock reads must come from the Virtual Clock so busy-waits terminate deterministically.
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
  defineValue(global, 'performance', performanceObject)
  defineValue(global, 'console', consoleObject)
}
