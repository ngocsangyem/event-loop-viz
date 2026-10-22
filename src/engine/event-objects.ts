// DOM Event and its subclasses the host fires or the Script constructs.
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'
import {
  bool,
  createHostObject,
  defineAttribute,
  defineData,
  defineInterface,
  defineMethod,
  failedToExecute,
  hostDataOf,
  isObject,
  member,
  num,
  prototypeFor,
  str,
  toDOMString,
  typeError,
} from './web-idl-helpers'
import type { Interface, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

/** Extra members of an Event subclass (MessageEvent data, ErrorEvent error, CustomEvent detail...). */
export type EventExtras = Record<string, EngineValue>

/** The state of one Event object (DOM Standard "event" concept). */
export class EventData {
  target: EngineValue = E.Value.null
  currentTarget: EngineValue = E.Value.null
  eventPhase = 0
  stopPropagation = false
  stopImmediatePropagation = false
  canceled = false
  inPassiveListener = false
  dispatching = false
  path: EngineValue[] = []
  constructor(
    readonly type: string,
    readonly bubbles: boolean,
    readonly cancelable: boolean,
    readonly composed: boolean,
    readonly isTrusted: boolean,
    readonly timeStamp: number,
    readonly extras: EventExtras = {},
  ) {}
  mark(m: (value: unknown) => void) {
    m(this.target)
    m(this.currentTarget)
    this.path.forEach(m)
    Object.values(this.extras).forEach(m)
  }
}

const isEventData = (data: unknown): data is EventData => data instanceof EventData
export const eventDataOf = (value: EngineValue) => hostDataOf(value, isEventData)

/** The event interfaces of one realm; `create` makes an event the host fires (isTrusted). */
export interface EventInterfaces {
  Event: Interface
  CustomEvent: Interface
  MessageEvent: Interface
  ErrorEvent: Interface
  PromiseRejectionEvent: Interface
  PointerEvent: Interface
  /** An event the host fires; `isTrusted` is false only for synthetic ones such as `click()`. */
  create(
    iface: Interface,
    type: string,
    init: { bubbles?: boolean; cancelable?: boolean; composed?: boolean },
    extras?: EventExtras,
    isTrusted?: boolean,
  ): ObjectValue
}

/** Installs Event, CustomEvent, MessageEvent, ErrorEvent, PromiseRejectionEvent and PointerEvent. */
export function installEventInterfaces(realm: Realm, global: ObjectValue, nowMs: () => number): EventInterfaces {
  const thisEvent = (thisValue: EngineValue, operation: string): EventData =>
    eventDataOf(thisValue) ?? typeError(failedToExecute(operation, 'Event', 'Illegal invocation'))
  const attr = (target: ObjectValue, name: string, get: (data: EventData) => EngineValue) =>
    defineAttribute(realm, target, name, (thisValue) => get(thisEvent(thisValue, name)))

  /** Builds the constructor steps of an Event interface: type, the EventInit members, then the extras. */
  const constructorOf =
    (name: string, extrasOf: (init: EngineValue) => EventExtras, getPrototype: () => ObjectValue, required = 1) =>
    (args: EngineValue[], { newTarget }: { newTarget: EngineValue }) => {
      if (args.length < required) {
        typeError(`Failed to construct '${name}': ${required} argument${required > 1 ? 's' : ''} required, but only ${args.length} present.`)
      }
      const type = toDOMString(args[0]!)
      const init = args[1] ?? E.Value.undefined
      const data = new EventData(
        type,
        E.ToBoolean(member(init, 'bubbles') as never),
        E.ToBoolean(member(init, 'cancelable') as never),
        E.ToBoolean(member(init, 'composed') as never),
        false,
        nowMs(),
        extrasOf(init),
      )
      return createHostObject(prototypeFor(newTarget, getPrototype()), data)
    }

  const Event: Interface = defineInterface(realm, global, 'Event', {
    length: 1,
    construct: constructorOf('Event', () => ({}), () => Event.prototype),
  })
  const p = Event.prototype
  for (const [constant, value] of [['NONE', 0], ['CAPTURING_PHASE', 1], ['AT_TARGET', 2], ['BUBBLING_PHASE', 3]] as const) {
    defineData(p, constant, num(value), { enumerable: true, writable: false, configurable: false })
    defineData(Event.constructor, constant, num(value), { enumerable: true, writable: false, configurable: false })
  }
  attr(p, 'type', (d) => str(d.type))
  attr(p, 'target', (d) => d.target)
  attr(p, 'srcElement', (d) => d.target)
  attr(p, 'currentTarget', (d) => d.currentTarget)
  attr(p, 'eventPhase', (d) => num(d.eventPhase))
  attr(p, 'bubbles', (d) => bool(d.bubbles))
  attr(p, 'cancelable', (d) => bool(d.cancelable))
  attr(p, 'composed', (d) => bool(d.composed))
  attr(p, 'defaultPrevented', (d) => bool(d.canceled))
  attr(p, 'isTrusted', (d) => bool(d.isTrusted))
  attr(p, 'timeStamp', (d) => num(d.timeStamp))
  defineAttribute(
    realm,
    p,
    'returnValue',
    (thisValue) => bool(!thisEvent(thisValue, 'returnValue').canceled),
    (thisValue, value) => {
      const d = thisEvent(thisValue, 'returnValue')
      if (!E.ToBoolean(value as never) && d.cancelable && !d.inPassiveListener) d.canceled = true
    },
  )
  defineAttribute(
    realm,
    p,
    'cancelBubble',
    (thisValue) => bool(thisEvent(thisValue, 'cancelBubble').stopPropagation),
    (thisValue, value) => {
      if (E.ToBoolean(value as never)) thisEvent(thisValue, 'cancelBubble').stopPropagation = true
    },
  )
  defineMethod(realm, p, 'stopPropagation', 0, (_a, { thisValue }) => {
    thisEvent(thisValue, 'stopPropagation').stopPropagation = true
  })
  defineMethod(realm, p, 'stopImmediatePropagation', 0, (_a, { thisValue }) => {
    const d = thisEvent(thisValue, 'stopImmediatePropagation')
    d.stopPropagation = true
    d.stopImmediatePropagation = true
  })
  defineMethod(realm, p, 'preventDefault', 0, (_a, { thisValue }) => {
    const d = thisEvent(thisValue, 'preventDefault')
    if (d.cancelable && !d.inPassiveListener) d.canceled = true
  })
  defineMethod(realm, p, 'composedPath', 0, (_a, { thisValue }) => {
    const d = thisEvent(thisValue, 'composedPath')
    return E.CreateArrayFromList(d.dispatching ? (d.path as never) : []) as unknown as EngineValue
  })

  /** A subclass whose extra members are read-only attributes read from `extras`; `members` gives each default. */
  const subclass = (name: string, parent: Interface, members: Record<string, () => EngineValue>, required = 1): Interface => {
    const iface: Interface = defineInterface(realm, global, name, {
      parent,
      length: required,
      construct: constructorOf(
        name,
        (init) => {
          const extras: EventExtras = {}
          for (const [key, fallback] of Object.entries(members)) {
            const value = member(init, key)
            extras[key] = value === E.Value.undefined ? fallback() : value
          }
          if (name === 'PromiseRejectionEvent' && !isObject(extras.promise)) {
            typeError(`Failed to construct 'PromiseRejectionEvent': Failed to read the 'promise' property from 'PromiseRejectionEventInit': Required member is undefined.`)
          }
          return extras
        },
        () => iface.prototype,
        required,
      ),
    })
    for (const key of Object.keys(members)) {
      defineAttribute(realm, iface.prototype, key, (thisValue) => {
        const d = eventDataOf(thisValue) ?? typeError('Illegal invocation')
        return d.extras[key] ?? (d.extras[key] = members[key]!())
      })
    }
    return iface
  }

  const nullValue = () => E.Value.null
  const undefinedValue = () => E.Value.undefined
  const emptyString = () => str('')
  const zero = () => num(0)
  const CustomEvent = subclass('CustomEvent', Event, { detail: nullValue })
  const MessageEvent = subclass('MessageEvent', Event, {
    data: nullValue,
    origin: emptyString,
    lastEventId: emptyString,
    source: nullValue,
    ports: () => E.CreateArrayFromList([]) as unknown as EngineValue,
  })
  const ErrorEvent = subclass('ErrorEvent', Event, {
    message: emptyString,
    filename: emptyString,
    lineno: zero,
    colno: zero,
    error: undefinedValue,
  })
  const PromiseRejectionEvent = subclass('PromiseRejectionEvent', Event, { promise: undefinedValue, reason: undefinedValue }, 2)
  // `click()` fires a PointerEvent (Chrome 155); only `detail` matters to Scripts here.
  const UIEvent = subclass('UIEvent', Event, { detail: zero, view: nullValue })
  const MouseEvent = subclass('MouseEvent', UIEvent, {})
  const PointerEvent = subclass('PointerEvent', MouseEvent, {})

  return {
    Event,
    CustomEvent,
    MessageEvent,
    ErrorEvent,
    PromiseRejectionEvent,
    PointerEvent,
    create(iface, type, init, extras = {}, isTrusted = true) {
      const data = new EventData(type, !!init.bubbles, !!init.cancelable, !!init.composed, isTrusted, nowMs(), extras)
      return createHostObject(iface.prototype, data)
    },
  }
}
