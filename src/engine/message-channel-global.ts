// MessageChannel / MessagePort for engine262 realms (ADR-0010). Imports engine262, so it lives in src/engine.
import * as E from '@engine262/engine262'
import type { CallbackHandle } from '../host/engine-adapter'

type EngineValue = E.Value
type ObjectValue = InstanceType<typeof E.ObjectValue>
type NativeSteps = Parameters<typeof E.CreateBuiltinFunction>[0]
type HelperSteps = Parameters<typeof E.CreateBuiltinFunction.from>[0]
type NativeGenerator = (...args: EngineValue[]) => Generator<unknown, unknown, unknown>

export interface MessageChannelDeps {
  realm: InstanceType<typeof E.ManagedRealm>
  /** Defines a non-enumerable method on `target`; engine262 natives are generators of positional args. */
  defineFunction(target: ObjectValue, name: string, steps: NativeGenerator): void
  /** Makes a script function callable by the host as a Task callback. */
  registerCallback(fn: EngineValue): CallbackHandle
  /** Asks the host to queue a port-message Task that will call `deliver`. */
  enqueuePortMessage(deliver: CallbackHandle): void
}

interface PortState {
  object: ObjectValue
  /** The entangled port; cleared when either side closes. */
  peer: PortState | undefined
  /** Messages stay in the inbox until the port is started (onmessage set or start() called). */
  started: boolean
  closed: boolean
  handler: EngineValue
  inbox: EngineValue[]
}

const setPlain = (target: ObjectValue, name: string, value: EngineValue, enumerable = true) =>
  target.properties.set(
    E.Value(name),
    E.Descriptor({ Configurable: true, Enumerable: enumerable, Writable: true, Value: value }),
  )

/** Installs the `MessageChannel` constructor on the realm's global object. */
export function installMessageChannel(deps: MessageChannelDeps): void {
  const { realm } = deps
  const objectPrototype = () => realm.Intrinsics['%Object.prototype%']

  /** One delivery Task hands exactly one inbox message to the port's current handler. */
  const scheduleDelivery = (port: PortState) => {
    const deliver = function* (): Generator<unknown, unknown, unknown> {
      const message = port.inbox.shift()
      if (message === undefined || port.closed || !E.isFunctionObject(port.handler)) {
        return E.Value.undefined
      }
      const event = E.OrdinaryObjectCreate(objectPrototype())
      setPlain(event, 'type', E.Value('message'))
      setPlain(event, 'data', message)
      setPlain(event, 'target', port.object)
      return yield* (E.Call(port.handler, port.object, [event]) as Generator<unknown, unknown, unknown>)
    }
    Object.defineProperty(deliver, 'name', { value: 'MessagePort message dispatch' })
    const fn = E.CreateBuiltinFunction.from(deliver as unknown as HelperSteps, 'MessagePort message dispatch')
    deps.enqueuePortMessage(deps.registerCallback(fn))
  }

  const start = (port: PortState) => {
    if (port.started) return
    port.started = true
    for (let i = 0; i < port.inbox.length; i++) scheduleDelivery(port)
  }

  const createPort = (): PortState => {
    const port: PortState = {
      object: E.OrdinaryObjectCreate(objectPrototype()),
      peer: undefined,
      started: false,
      closed: false,
      handler: E.Value.null,
      inbox: [],
    }
    deps.defineFunction(port.object, 'postMessage', function* (message = E.Value.undefined) {
      const target = port.peer
      if (port.closed || !target || target.closed) return E.Value.undefined
      target.inbox.push(message)
      if (target.started) scheduleDelivery(target)
      return E.Value.undefined
    })
    deps.defineFunction(port.object, 'start', function* () {
      if (!port.closed) start(port)
      return E.Value.undefined
    })
    deps.defineFunction(port.object, 'close', function* () {
      port.closed = true
      if (port.peer) port.peer.peer = undefined
      port.peer = undefined
      return E.Value.undefined
    })
    const getter = E.CreateBuiltinFunction.from(function* () {
      return port.handler
    } as unknown as HelperSteps, 'get onmessage')
    const setter = E.CreateBuiltinFunction.from(function* (value = E.Value.undefined) {
      port.handler = E.isFunctionObject(value) ? value : E.Value.null
      // Setting onmessage enables the port message queue even for null (HTML MessagePort).
      if (!port.closed) start(port)
      return E.Value.undefined
    } as unknown as HelperSteps, 'set onmessage')
    port.object.properties.set(
      E.Value('onmessage'),
      E.Descriptor({ Get: getter, Set: setter, Enumerable: true, Configurable: true }),
    )
    return port
  }

  const construct = function* (_args: unknown, context: { NewTarget: EngineValue }) {
    if (context.NewTarget === E.Value.undefined) {
      return E.Throw.TypeError("Failed to construct 'MessageChannel': Please use the 'new' operator")
    }
    const port1 = createPort()
    const port2 = createPort()
    port1.peer = port2
    port2.peer = port1
    const channel = E.OrdinaryObjectCreate(objectPrototype())
    setPlain(channel, 'port1', port1.object)
    setPlain(channel, 'port2', port2.object)
    return channel
  }
  ;(construct as unknown as NativeSteps).isConstructor = true
  const constructor = E.CreateBuiltinFunction(construct as unknown as NativeSteps, 0, 'MessageChannel', [], realm)
  setPlain(realm.GlobalObject, 'MessageChannel', constructor, false)
}
