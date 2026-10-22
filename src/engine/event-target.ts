// EventTarget, the DOM dispatch algorithm and event handler attributes (`onmessage`, `onclick`).
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'
import type { EventData } from './event-objects'
import { eventDataOf } from './event-objects'
import type { ThrowDOMException } from './dom-exception'
import {
  bool,
  createHostObject,
  defineAttribute,
  defineInterface,
  defineMethod,
  failedToExecute,
  hostDataOf,
  isCallable,
  isObject,
  member,
  prototypeFor,
  toDOMString,
  typeError,
} from './web-idl-helpers'
import type { Interface, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

export interface Listener {
  type: string
  /** A function, an object with `handleEvent`, or the handler slot name for an `on<type>` handler. */
  callback: EngineValue
  handler?: string
  capture: boolean
  once: boolean
  passive: boolean
  removed: boolean
}

/** Host data of every EventTarget: its listeners and `on<type>` handler values. */
export class EventTargetData {
  listeners: Listener[] = []
  /** Current value of each event handler attribute, by event type. */
  handlerValues = new Map<string, EngineValue>()
  /** DOM "get the parent": the next object on an event's path, or null. */
  parent(_event: EventData): ObjectValue | null {
    return null
  }
  mark(m: (value: unknown) => void) {
    for (const l of this.listeners) m(l.callback)
    this.handlerValues.forEach(m)
  }
}

const isTargetData = (d: unknown): d is EventTargetData => d instanceof EventTargetData

/**
 * Calls one listener: `fn` with `thisArg`, or, with `viaHandleEvent`, the `handleEvent` method of
 * the listener object `fn`. Returns the result, or undefined when it threw (the caller reports it).
 */
export type CallListener = (fn: EngineValue, thisArg: EngineValue, args: EngineValue[], viaHandleEvent?: boolean) => EngineValue | undefined

/** The engine steps of one listener call (DOM call a user object's operation). */
export function* listenerCallSteps(fn: EngineValue, thisArg: EngineValue, args: EngineValue[], viaHandleEvent: boolean) {
  if (!viaHandleEvent) return yield* E.Call(fn as never, thisArg as never, args as never)
  const handleEvent = E.EnsureCompletion(yield* E.Get(fn as never, E.Value('handleEvent')))
  if (handleEvent instanceof E.ThrowCompletion) return handleEvent
  if (!E.IsCallable(handleEvent.Value as never)) return E.Throw.TypeError("Failed to execute 'handleEvent' on 'EventListener': The provided callback is not callable.")
  return yield* E.Call(handleEvent.Value as never, fn as never, args as never)
}

export interface EventTargets {
  EventTarget: Interface
  /** The EventTarget data of `value` (the global object counts), or undefined. */
  targetDataOf(value: EngineValue): EventTargetData | undefined
  /** DOM dispatch: runs the listeners along the path; returns false when the event was canceled. */
  dispatch(target: ObjectValue, event: ObjectValue, call: CallListener): boolean
  /** Defines `on<type>` on `prototype`. `onerror` on the window gets the five-argument form. */
  defineEventHandler(prototype: ObjectValue, type: string, onSet?: (target: EngineValue, value: EngineValue) => void): void
  /** The listeners that would run for `type` at `target` now (for the chip a queued event shows). */
  listenersFor(target: EngineValue, type: string): EngineValue[]
}

export function installEventTarget(
  realm: Realm,
  global: ObjectValue,
  throwDOMException: ThrowDOMException,
  /** Script call made synchronously from inside `dispatchEvent` (the stack is not empty). */
  syncCall: CallListener,
): EventTargets {
  // The global object is created with a HostData slot, so it is a target like any other.
  const targetDataOf = (value: EngineValue) => hostDataOf(value, isTargetData)
  // Web IDL: an operation called with an undefined `this` (`addEventListener(...)` at top level)
  // acts on the global object.
  const thisTarget = (thisValue: EngineValue, operation: string): EventTargetData =>
    targetDataOf(thisValue === E.Value.undefined || thisValue === E.Value.null ? global : thisValue) ??
    typeError(failedToExecute(operation, 'EventTarget', 'Illegal invocation'))

  const EventTarget: Interface = defineInterface(realm, global, 'EventTarget', {
    construct: (_args, { newTarget }) => createHostObject(prototypeFor(newTarget, EventTarget.prototype), new EventTargetData()),
  })

  const flatten = (options: EngineValue | undefined) =>
    isObject(options) ? E.ToBoolean(member(options, 'capture') as never) : E.ToBoolean((options ?? E.Value.undefined) as never)

  const requireArgs = (operation: string, args: EngineValue[], count: number) => {
    if (args.length < count) {
      typeError(failedToExecute(operation, 'EventTarget', `${count} arguments required, but only ${args.length} present.`))
    }
  }

  defineMethod(realm, EventTarget.prototype, 'addEventListener', 2, (args, { thisValue }) => {
    const data = thisTarget(thisValue, 'addEventListener')
    requireArgs('addEventListener', args, 2)
    const type = toDOMString(args[0]!)
    const callback = args[1]!
    if (callback === E.Value.null || callback === E.Value.undefined) return
    if (!isObject(callback)) typeError(failedToExecute('addEventListener', 'EventTarget', "parameter 2 is not of type 'Object'."))
    const options = args[2]
    const capture = flatten(options)
    const once = isObject(options) && E.ToBoolean(member(options, 'once') as never)
    const passive = isObject(options) && E.ToBoolean(member(options, 'passive') as never)
    if (data.listeners.some((l) => !l.removed && l.type === type && l.callback === callback && l.capture === capture)) return
    data.listeners.push({ type, callback, capture, once, passive, removed: false })
  })

  defineMethod(realm, EventTarget.prototype, 'removeEventListener', 2, (args, { thisValue }) => {
    const data = thisTarget(thisValue, 'removeEventListener')
    requireArgs('removeEventListener', args, 2)
    const type = toDOMString(args[0]!)
    const callback = args[1]!
    const capture = flatten(args[2])
    const listener = data.listeners.find(
      (l) => !l.removed && !l.handler && l.type === type && l.callback === callback && l.capture === capture,
    )
    if (!listener) return
    listener.removed = true
    data.listeners = data.listeners.filter((l) => l !== listener)
  })

  defineMethod(realm, EventTarget.prototype, 'dispatchEvent', 1, (args, { thisValue }) => {
    thisTarget(thisValue, 'dispatchEvent')
    if (args.length < 1) typeError(failedToExecute('dispatchEvent', 'EventTarget', '1 argument required, but only 0 present.'))
    const event = args[0]!
    const data = eventDataOf(event) ?? typeError(failedToExecute('dispatchEvent', 'EventTarget', "parameter 1 is not of type 'Event'."))
    if (data.dispatching) {
      throwDOMException('InvalidStateError', failedToExecute('dispatchEvent', 'EventTarget', 'The event is already being dispatched.'))
    }
    const target = (thisValue === E.Value.undefined || thisValue === E.Value.null ? global : thisValue) as ObjectValue
    return bool(dispatch(target, event as ObjectValue, syncCall))
  })

  /** DOM inner invoke: runs the matching listeners of one object on the path. */
  function invoke(object: ObjectValue, event: ObjectValue, data: EventData, phase: 'capturing' | 'bubbling', call: CallListener) {
    const targetData = targetDataOf(object)
    if (!targetData) return
    // Listeners added during this dispatch do not run; removed ones are skipped.
    for (const listener of targetData.listeners.slice()) {
      if (listener.removed || listener.type !== data.type) continue
      if ((phase === 'capturing') !== listener.capture) continue
      if (listener.once) {
        listener.removed = true
        targetData.listeners = targetData.listeners.filter((l) => l !== listener)
      }
      data.currentTarget = object
      if (listener.passive) data.inPassiveListener = true
      invokeListener(object, event, data, listener, targetData, call)
      data.inPassiveListener = false
      if (data.stopImmediatePropagation) return
    }
  }

  function invokeListener(
    object: ObjectValue,
    event: ObjectValue,
    data: EventData,
    listener: Listener,
    targetData: EventTargetData,
    call: CallListener,
  ) {
    if (listener.handler !== undefined) {
      const handler = targetData.handlerValues.get(listener.handler)
      if (!isCallable(handler)) return
      // HTML: onerror on a window gets (message, source, lineno, colno, error); true cancels it.
      if (listener.handler === 'error' && object === global && data.extras.message !== undefined) {
        const { message, filename, lineno, colno, error } = data.extras
        const result = call(handler, object, [message!, filename!, lineno!, colno!, error ?? E.Value.undefined])
        if (result === E.Value.true && data.cancelable) data.canceled = true
        return
      }
      const result = call(handler, object, [event])
      if (result === E.Value.false && data.cancelable && !data.inPassiveListener) data.canceled = true
      return
    }
    const callback = listener.callback
    if (isCallable(callback)) call(callback, object, [event])
    else call(callback, callback, [event], true)
  }

  function dispatch(target: ObjectValue, event: ObjectValue, call: CallListener): boolean {
    const data = eventDataOf(event)!
    data.dispatching = true
    data.target = target
    const path: ObjectValue[] = [target]
    for (let parent = targetDataOf(target)?.parent(data) ?? null; parent; parent = targetDataOf(parent)?.parent(data) ?? null) {
      path.push(parent)
    }
    data.path = path
    try {
      for (let i = path.length - 1; i > 0 && !data.stopPropagation; i--) {
        data.eventPhase = 1
        invoke(path[i]!, event, data, 'capturing', call)
      }
      if (!data.stopPropagation) {
        data.eventPhase = 2
        invoke(target, event, data, 'capturing', call)
        if (!data.stopPropagation) invoke(target, event, data, 'bubbling', call)
      }
      if (data.bubbles) {
        for (let i = 1; i < path.length && !data.stopPropagation; i++) {
          data.eventPhase = 3
          invoke(path[i]!, event, data, 'bubbling', call)
        }
      }
    } finally {
      data.eventPhase = 0
      data.currentTarget = E.Value.null
      data.path = []
      data.dispatching = false
      data.stopPropagation = false
      data.stopImmediatePropagation = false
    }
    return !data.canceled
  }

  function defineEventHandler(prototype: ObjectValue, type: string, onSet?: (target: EngineValue, value: EngineValue) => void) {
    defineAttribute(
      realm,
      prototype,
      `on${type}`,
      (thisValue) => thisTarget(thisValue, `on${type}`).handlerValues.get(type) ?? E.Value.null,
      (thisValue, value) => {
        const data = thisTarget(thisValue, `on${type}`)
        const callable = isCallable(value) ? value : E.Value.null
        const active = data.listeners.find((l) => l.handler === type)
        if (callable === E.Value.null) {
          // Deactivate: the handler's listener leaves the list; a later set adds it at the end.
          data.handlerValues.delete(type)
          if (active) {
            active.removed = true
            data.listeners = data.listeners.filter((l) => l !== active)
          }
        } else {
          data.handlerValues.set(type, callable)
          if (!active) data.listeners.push({ type, callback: E.Value.null, handler: type, capture: false, once: false, passive: false, removed: false })
        }
        onSet?.(thisValue === E.Value.undefined ? global : thisValue, callable)
      },
    )
  }

  function listenersFor(target: EngineValue, type: string): EngineValue[] {
    const data = targetDataOf(target)
    if (!data) return []
    return data.listeners
      .filter((l) => !l.removed && l.type === type)
      .map((l) => (l.handler !== undefined ? (data.handlerValues.get(l.handler) ?? E.Value.null) : l.callback))
  }

  return { EventTarget, targetDataOf, dispatch, defineEventHandler, listenersFor }
}
