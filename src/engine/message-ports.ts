// MessageChannel and MessagePort (HTML 9.4): entangled ports, port message queues, transfer.
import * as E from '@engine262/engine262'
import type { CallbackHandle } from '../host/engine-adapter'
import type { EngineValue } from './engine262-types'
import type { ScriptCaller } from './host-callbacks'
import type { EventInterfaces } from './event-objects'
import { EventTargetData } from './event-target'
import type { EventTargets } from './event-target'
import type { CloneHooks, CloneResult } from './structured-clone'
import {
  createHostObject,
  defineAttribute,
  defineInterface,
  defineMethod,
  failedToExecute,
  hostDataOf,
  str,
  typeError,
} from './web-idl-helpers'
import type { Interface, Markable, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

interface QueuedMessage {
  value: EngineValue
  ports: ObjectValue[]
}

/** One end of a channel. It outlives the port object: a transfer moves it to a new object. */
class PortEndpoint implements Markable {
  peer: PortEndpoint | undefined
  inbox: QueuedMessage[] = []
  /** Delivery Tasks queued and not run yet; each hands over one inbox message. */
  pendingDeliveries = 0
  started = false
  closed = false
  object: ObjectValue | undefined
  mark(m: (value: unknown) => void) {
    m(this.object)
    for (const message of this.inbox) {
      m(message.value)
      message.ports.forEach(m)
    }
  }
}

/** Host data of a MessagePort object; `endpoint` is undefined once the port was transferred away. */
class PortData extends EventTargetData {
  constructor(public endpoint: PortEndpoint | undefined) {
    super()
  }
  override mark(m: (value: unknown) => void) {
    super.mark(m)
    this.endpoint?.mark(m)
    m(this.endpoint?.peer?.object)
  }
}
const isPortData = (d: unknown): d is PortData => d instanceof PortData

class ChannelData {
  constructor(
    readonly port1: ObjectValue,
    readonly port2: ObjectValue,
  ) {}
  mark(m: (value: unknown) => void) {
    m(this.port1)
    m(this.port2)
  }
}
const isChannelData = (d: unknown): d is ChannelData => d instanceof ChannelData

export interface MessagePortDeps {
  realm: Realm
  global: ObjectValue
  events: EventInterfaces
  targets: EventTargets
  /** Queues a port-message Task running `steps`; `info` is the chip, `roots` what it keeps alive. */
  queuePortTask(steps: (caller: ScriptCaller) => void, info: EngineValue | undefined, roots: Markable): CallbackHandle
  clone(value: EngineValue, transfer: EngineValue[], iface: 'Window' | 'MessagePort', hooks: CloneHooks, sourcePort?: EngineValue): CloneResult
  /** The full clone hooks (ports, shared buffers, host object names), built after the ports. */
  cloneHooks(): CloneHooks
  readTransfer(value: EngineValue | undefined): { transfer: EngineValue[] }
  /** Dispatches a host-fired event: listeners through `caller`, a Checkpoint between them. */
  dispatchFromLoop(target: ObjectValue, event: ObjectValue, caller: ScriptCaller): void
}

export interface MessagePorts {
  MessagePort: Interface
  hooks: Omit<CloneHooks, 'shareBuffer' | 'interfaceName'>
}

export function installMessagePorts(deps: MessagePortDeps): MessagePorts {
  const { realm, global, events, targets } = deps
  const portDataOf = (value: EngineValue) => hostDataOf(value, isPortData)

  const MessagePort: Interface = defineInterface(realm, global, 'MessagePort', { parent: targets.EventTarget })
  const createPort = (endpoint: PortEndpoint | undefined) => {
    const object = createHostObject(MessagePort.prototype, new PortData(endpoint))
    if (endpoint) endpoint.object = object
    return object
  }

  /** One delivery Task: fires `message` at the port with the oldest queued message. */
  const scheduleDelivery = (endpoint: PortEndpoint) => {
    endpoint.pendingDeliveries++
    deps.queuePortTask(
      (caller) => {
        endpoint.pendingDeliveries--
        // A port transferred meanwhile keeps its messages until its new object starts.
        if (!endpoint.started || endpoint.closed || !endpoint.object) return
        const message = endpoint.inbox.shift()
        if (!message) return
        const event = caller.inRealm(() =>
          events.create(events.MessageEvent, 'message', {}, {
            data: message.value,
            origin: str(''),
            lastEventId: str(''),
            source: E.Value.null,
            ports: E.CreateArrayFromList(message.ports as never) as unknown as EngineValue,
          }),
        )
        deps.dispatchFromLoop(endpoint.object, event, caller)
      },
      endpoint.object && targets.listenersFor(endpoint.object, 'message')[0],
      endpoint,
    )
  }

  const start = (endpoint: PortEndpoint) => {
    if (endpoint.started || endpoint.closed) return
    endpoint.started = true
    for (let i = endpoint.pendingDeliveries; i < endpoint.inbox.length; i++) scheduleDelivery(endpoint)
  }

  const thisPort = (thisValue: EngineValue, operation: string) =>
    portDataOf(thisValue) ?? typeError(failedToExecute(operation, 'MessagePort', 'Illegal invocation'))

  const p = MessagePort.prototype
  defineMethod(realm, p, 'postMessage', 1, (args, { thisValue }) => {
    const data = thisPort(thisValue, 'postMessage')
    if (args.length < 1) typeError(failedToExecute('postMessage', 'MessagePort', '1 argument required, but only 0 present.'))
    const { transfer } = deps.readTransfer(args[1])
    const message = deps.clone(args[0]!, transfer, 'MessagePort', deps.cloneHooks(), thisValue)
    const target = data.endpoint?.peer
    if (!data.endpoint || data.endpoint.closed || !target || target.closed) return
    target.inbox.push({ value: message.value, ports: message.ports })
    if (target.started) scheduleDelivery(target)
  })
  defineMethod(realm, p, 'start', 0, (_args, { thisValue }) => {
    const endpoint = thisPort(thisValue, 'start').endpoint
    if (endpoint) start(endpoint)
  })
  defineMethod(realm, p, 'close', 0, (_args, { thisValue }) => {
    const endpoint = thisPort(thisValue, 'close').endpoint
    if (!endpoint) return
    endpoint.closed = true
    if (endpoint.peer) endpoint.peer.peer = undefined
    endpoint.peer = undefined
  })
  // Setting onmessage enables the port message queue, even to null (HTML MessagePort).
  targets.defineEventHandler(p, 'message', (target) => {
    const endpoint = portDataOf(target)?.endpoint
    if (endpoint) start(endpoint)
  })
  targets.defineEventHandler(p, 'messageerror')

  const MessageChannel = defineInterface(realm, global, 'MessageChannel', {
    construct: () => {
      const a = new PortEndpoint()
      const b = new PortEndpoint()
      a.peer = b
      b.peer = a
      const channel = createHostObject(MessageChannel.prototype, new ChannelData(createPort(a), createPort(b)))
      return channel
    },
  })
  const channelOf = (thisValue: EngineValue) => hostDataOf(thisValue, isChannelData) ?? typeError('Illegal invocation')
  defineAttribute(realm, MessageChannel.prototype, 'port1', (t) => channelOf(t).port1)
  defineAttribute(realm, MessageChannel.prototype, 'port2', (t) => channelOf(t).port2)

  const hooks: MessagePorts['hooks'] = {
    isPort: (value) => portDataOf(value) !== undefined,
    isNeuteredPort: (value) => portDataOf(value)?.endpoint === undefined,
    transferPort(value) {
      const old = portDataOf(value)!
      const port = createHostObject(MessagePort.prototype, new PortData(undefined))
      return {
        port,
        commit() {
          const endpoint = old.endpoint!
          old.endpoint = undefined
          // The new port starts disabled; its queued messages wait for start() / onmessage.
          endpoint.started = false
          endpoint.object = port
          portDataOf(port)!.endpoint = endpoint
        },
      }
    },
  }
  return { MessagePort, hooks }
}
