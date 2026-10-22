// The global object as a Window: its prototype chain, aliases, event handlers, postMessage and
// animation frames. The page modelled is the Oracle's: an about:blank document (origin "null").
import * as E from '@engine262/engine262'
import type { CallbackHandle, HostBindings } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { EngineValue } from './engine262-types'
import type { Invocation, ScriptCaller } from './host-callbacks'
import type { EventInterfaces, EventData } from './event-objects'
import { EventTargetData } from './event-target'
import type { EventTargets } from './event-target'
import type { CloneHooks, CloneResult } from './structured-clone'
import type { ThrowDOMException } from './dom-exception'
import {
  defineAttribute,
  defineData,
  defineInterface,
  failedToExecute,
  isCallable,
  isObject,
  makeFunction,
  member,
  run,
  str,
  toDOMString,
  typeError,
} from './web-idl-helpers'
import type { Markable, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

/** The page's origin: the Oracle loads Fixtures into about:blank. */
export const PAGE_ORIGIN = 'null'

/** Host data of the global object. */
export class WindowData extends EventTargetData {
  document: ObjectValue | undefined
  override parent(_event: EventData): ObjectValue | null {
    return null
  }
  override mark(m: (value: unknown) => void) {
    super.mark(m)
    m(this.document)
  }
}

export interface WindowDeps {
  realm: Realm
  global: ObjectValue
  bindings: HostBindings
  events: EventInterfaces
  targets: EventTargets
  throwDOMException: ThrowDOMException
  describe(fn: EngineValue): CallbackInfo | undefined
  register(invocation: Invocation, info?: CallbackInfo, roots?: Markable): CallbackHandle
  clone(value: EngineValue, transfer: EngineValue[], iface: 'Window' | 'MessagePort', hooks: CloneHooks, sourcePort?: EngineValue): CloneResult
  cloneHooks: CloneHooks
  readTransfer(value: EngineValue | undefined): { transfer: EngineValue[] }
  dispatchFromLoop(target: ObjectValue, event: ObjectValue, caller: ScriptCaller): void
}

/** Reads a `sequence<object>` transfer list, or the `transfer` member of an options dictionary. */
export function readTransferList(value: EngineValue | undefined): { transfer: EngineValue[] } {
  if (value === undefined || value === E.Value.undefined || value === E.Value.null) return { transfer: [] }
  if (!isObject(value)) typeError("The provided value cannot be converted to a sequence.")
  const list = E.isArrayExoticObject(value as never) ? value : member(value, 'transfer')
  if (!isObject(list)) return { transfer: [] }
  const length = run<number>(E.LengthOfArrayLike(list as never))
  const transfer: EngineValue[] = []
  for (let i = 0; i < length; i++) transfer.push(run<EngineValue>(E.Get(list as never, E.Value(String(i)))))
  return { transfer }
}

export function installWindow(deps: WindowDeps) {
  const { realm, global, bindings, events, targets } = deps
  const Window = defineInterface(realm, global, 'Window', { parent: targets.EventTarget })
  ;(global as unknown as { Prototype: ObjectValue }).Prototype = Window.prototype

  // `window`, `self`, `frames`, `parent` and `top` all name the window itself (one top-level page).
  for (const name of ['window', 'self', 'frames', 'parent', 'top']) {
    defineAttribute(realm, global, name, () => global)
  }
  defineData(global, 'origin', str(PAGE_ORIGIN), { enumerable: true })
  // The simulated page is cross-origin isolated so SharedArrayBuffer exists (it does in Chrome
  // only on such a page).
  defineData(global, 'crossOriginIsolated', E.Value.true, { enumerable: true })
  defineData(global, 'isSecureContext', E.Value.true, { enumerable: true })

  for (const type of ['message', 'messageerror', 'error', 'unhandledrejection', 'rejectionhandled', 'click']) {
    targets.defineEventHandler(Window.prototype, type)
  }

  const define = (name: string, length: number, steps: Parameters<typeof makeFunction>[3]) =>
    defineData(global, name, makeFunction(realm, name, length, steps), { enumerable: true })
  const required = (operation: string, args: EngineValue[], count: number) => {
    if (args.length < count) {
      typeError(failedToExecute(operation, 'Window', `${count} argument${count > 1 ? 's' : ''} required, but only ${args.length} present.`))
    }
  }

  define('postMessage', 1, (args) => {
    required('postMessage', args, 1)
    let targetOrigin = '/'
    let transferValue: EngineValue | undefined = args[2]
    const second = args[1]
    if (isObject(second)) {
      // postMessage(message, options): a dictionary, even when it is an array.
      const origin = member(second, 'targetOrigin')
      if (origin !== E.Value.undefined) targetOrigin = toDOMString(origin)
      transferValue = member(second, 'transfer')
    } else if (second !== undefined && second !== E.Value.undefined) {
      targetOrigin = toDOMString(second)
    }
    let deliver = true
    if (targetOrigin !== '*' && targetOrigin !== '/') {
      let parsed: URL | undefined
      try {
        parsed = new URL(targetOrigin)
      } catch {
        deps.throwDOMException(
          'SyntaxError',
          failedToExecute('postMessage', 'Window', `Invalid target origin '${targetOrigin}' in a call to 'postMessage'.`),
        )
      }
      // An opaque origin (about:blank) only matches `*` and `/`.
      deliver = parsed!.origin !== 'null' && parsed!.origin === PAGE_ORIGIN
    }
    const { transfer } = deps.readTransfer(transferValue)
    const message = deps.clone(args[0]!, transfer, 'Window', deps.cloneHooks)
    if (!deliver) return
    const first = targets.listenersFor(global, 'message')[0]
    const handle = deps.register(
      {
        kind: 'steps',
        steps: (caller) => {
          const event = caller.inRealm(() =>
            events.create(events.MessageEvent, 'message', {}, {
              data: message.value,
              origin: str(PAGE_ORIGIN),
              lastEventId: str(''),
              source: global,
              ports: E.CreateArrayFromList(message.ports as never) as unknown as EngineValue,
            }),
          )
          deps.dispatchFromLoop(global, event, caller)
        },
      },
      (first && deps.describe(first)) ?? { kind: 'builtin', name: 'message event' },
      { mark: (m) => { m(message.value); message.ports.forEach(m) } },
    )
    bindings.queueTask('posted-message', handle)
  })

  define('requestAnimationFrame', 1, (args) => {
    required('requestAnimationFrame', args, 1)
    const callback = args[0]!
    if (!isCallable(callback)) typeError(failedToExecute('requestAnimationFrame', 'Window', "parameter 1 is not of type 'Function'."))
    const handle = deps.register({ kind: 'call', fn: callback, thisArg: global, origin: 'task-callback' }, deps.describe(callback))
    return E.Value(bindings.requestAnimationFrame(handle))
  })
  define('cancelAnimationFrame', 1, (args) => {
    required('cancelAnimationFrame', args, 1)
    const id = run<EngineValue>(E.ToNumber(args[0]! as never))
    bindings.cancelAnimationFrame(E.R(id as never) as number)
  })

  return { Window, windowData: () => targets.targetDataOf(global) as WindowData }
}
