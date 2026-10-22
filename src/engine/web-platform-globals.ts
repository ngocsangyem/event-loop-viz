// Installs the web platform a Script sees besides ECMAScript: DOMException, events, the window,
// message ports, the document, fetch, gc / FinalizationRegistry, SharedArrayBuffer and Atomics.
import * as E from '@engine262/engine262'
import type { CallbackHandle, HostBindings, UncaughtError } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { FetchMock } from '../host/fetch-mock-directives'
import type { EngineValue } from './engine262-types'
import type { EngineRunState } from './engine-run-state'
import type { Invocation, ScriptCaller } from './host-callbacks'
import { installDOMException } from './dom-exception'
import { installEventInterfaces } from './event-objects'
import { installEventTarget, listenerCallSteps } from './event-target'
import type { CallListener } from './event-target'
import { createStructuredClone } from './structured-clone'
import type { CloneHooks } from './structured-clone'
import { installMessagePorts } from './message-ports'
import { WindowData, installWindow, readTransferList } from './window-global'
import { installDocument } from './dom-document-global'
import { installFetch } from './fetch-global'
import { installFinalization } from './gc-and-finalization'
import { installSharedMemory } from './shared-memory-globals'
import { unsupportedApiError } from './unsupported-api-stubs'
import { Abrupt, run } from './web-idl-helpers'
import type { Markable, ObjectValue } from './web-idl-helpers'

export interface WebPlatformDeps {
  state: EngineRunState
  bindings: HostBindings
  fetchMocks: readonly FetchMock[]
  describe(fn: EngineValue): CallbackInfo | undefined
  register(invocation: Invocation, info?: CallbackInfo, roots?: Markable): CallbackHandle
  reportError(error: EngineValue, origin: UncaughtError['origin'], report: (e: UncaughtError) => void): void
  withHostContext<T>(fn: () => T): T
  /** True while the Script's own Task runs. */
  scriptRunning(): boolean
}

/** `Symbol.toStringTag` along the prototype chain, read without running Script code. */
function interfaceNameOf(value: EngineValue): string | undefined {
  if (!(value instanceof E.ObjectValue) || !('HostData' in value)) return undefined
  for (let o: unknown = value; o instanceof E.ObjectValue; o = (o as unknown as { Prototype: unknown }).Prototype) {
    const tag = (o as ObjectValue).properties.get(E.wellKnownSymbols.toStringTag as never)?.Value
    if (tag instanceof E.JSStringValue) return tag.stringValue()
  }
  return undefined
}

export function installWebPlatform(deps: WebPlatformDeps) {
  const { state, bindings } = deps
  const realm = state.realm
  const global = realm.GlobalObject as unknown as ObjectValue
  ;(global as unknown as { HostData: WindowData }).HostData = new WindowData()
  const throwUnsupported = (api: string): never => {
    throw new Abrupt(unsupportedApiError(api) as never)
  }

  const throwDOMException = installDOMException(realm, global)
  const events = installEventInterfaces(realm, global, () => bindings.virtualNowMs())
  // A listener called from dispatchEvent / click(): nested on the stack, its throw reported there.
  const syncCall: CallListener = (fn, thisArg, args, viaHandleEvent = false) => {
    try {
      return run<EngineValue>(listenerCallSteps(fn, thisArg, args, viaHandleEvent))
    } catch (error) {
      if (!(error instanceof Abrupt)) throw error
      deps.reportError(error.completion.Value as EngineValue, 'event-listener', bindings.reportException)
      return undefined
    }
  }
  const targets = installEventTarget(realm, global, throwDOMException, syncCall)
  /** An event the event loop fires: each listener is its own call, with a Checkpoint between. */
  const dispatchFromLoop = (target: ObjectValue, event: ObjectValue, caller: ScriptCaller) =>
    targets.dispatch(target, event, (fn, thisArg, args, viaHandleEvent) =>
      caller.call(fn, thisArg, args, 'event-listener', viaHandleEvent),
    )

  const clone = createStructuredClone(realm, throwDOMException, deps.withHostContext)
  const shared = installSharedMemory({ realm, global, bindings, register: deps.register, throwUnsupported })
  const ports = installMessagePorts({
    realm,
    global,
    events,
    targets,
    clone,
    cloneHooks: () => cloneHooks,
    readTransfer: readTransferList,
    dispatchFromLoop,
    queuePortTask(steps, listener, roots) {
      const handle = deps.register({ kind: 'steps', steps }, listener && deps.describe(listener), roots)
      bindings.queueTask('port-message', handle)
      return handle
    },
  })
  // Port steps read the hooks only when a message is posted, after this line has run.
  const cloneHooks: CloneHooks = { ...ports.hooks, shareBuffer: shared.shareBuffer, interfaceName: interfaceNameOf }

  const window = installWindow({
    realm,
    global,
    bindings,
    events,
    targets,
    throwDOMException,
    describe: deps.describe,
    register: deps.register,
    clone,
    cloneHooks,
    readTransfer: readTransferList,
    dispatchFromLoop,
  })
  window.windowData().document = installDocument({
    realm,
    global,
    events,
    targets,
    throwDOMException,
    throwUnsupported,
    syncCall,
    scriptRunning: deps.scriptRunning,
  })
  installFetch({ realm, global, bindings, mocks: deps.fetchMocks, register: deps.register })
  const finalization = installFinalization({
    realm,
    global,
    bindings,
    register: deps.register,
    describe: deps.describe,
    reportError: (error) => deps.reportError(error, 'task-callback', bindings.reportException),
  })

  return {
    events,
    targets,
    dispatchFromLoop,
    enqueueFinalizationCleanup: finalization.enqueueCleanup,
    markHostRoots: (m: (value: unknown) => void) => shared.mark(m),
  }
}

export type WebPlatform = ReturnType<typeof installWebPlatform>
