// HTML StructuredSerializeWithTransfer + StructuredDeserializeWithTransfer for postMessage, in one
// step: sender and receiver share the realm, so the copy is built at send time. Getters run then,
// and later mutation of the original is invisible to the receiver (verified in Chrome 155).
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'
import type { ThrowDOMException } from './dom-exception'
import { failedToExecute, isCallable, isObject, run } from './web-idl-helpers'
import type { ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>
type Slots = Record<string, unknown>

/** Host objects postMessage knows how to move (ports) or share (SharedArrayBuffer). */
export interface CloneHooks {
  isPort(value: EngineValue): boolean
  isNeuteredPort(value: EngineValue): boolean
  /**
   * Prepares a port's transfer: `port` is the object the receiver gets; `commit` neuters the old
   * one and hands the entanglement over (only once the whole message cloned without error).
   */
  transferPort(port: EngineValue): { port: ObjectValue; commit(): void }
  /** A SharedArrayBuffer is not copied: the clone wraps the same memory. */
  shareBuffer?(value: EngineValue): ObjectValue | undefined
  /** Name of a host object's interface (HTMLDivElement), for the error message. */
  interfaceName(value: EngineValue): string | undefined
}

export interface CloneResult {
  value: EngineValue
  /** The new ports, in transfer-list order (MessageEvent.ports). */
  ports: ObjectValue[]
}

const ERROR_NAMES = new Set(['Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError'])
const TYPED_ARRAYS = new Set([
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
  'Float16Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
])

export function createStructuredClone(
  realm: Realm,
  throwDOMException: ThrowDOMException,
  /** Runs `fn` as the host: no Trace events (formatting a value for an error message). */
  withHostContext: <T>(fn: () => T) => T,
) {
  const intrinsic = (name: string) => realm.Intrinsics[name as keyof typeof realm.Intrinsics] as unknown as ObjectValue
  const construct = (ctor: string, args: EngineValue[]) => run<ObjectValue>(E.Construct(intrinsic(ctor) as never, args as never))
  const get = (o: ObjectValue, key: string) => run<EngineValue>(E.Get(o as never, E.Value(key)))
  const slots = (v: EngineValue) => v as unknown as Slots

  /** How V8 names a value it cannot clone: the function's source text, `Symbol(x)`, or `#<Ctor>`. */
  const describeUncloneable = (value: EngineValue, hooks: CloneHooks): string =>
    withHostContext(() => {
      if (value instanceof E.SymbolValue) return E.inspect(value as never)
      if (isCallable(value)) {
        const toString = get(intrinsic('%Function.prototype%'), 'toString')
        const text = run<EngineValue>(E.Call(toString as never, value as never, []))
        return text instanceof E.JSStringValue ? text.stringValue() : 'function'
      }
      const hostName = hooks.interfaceName(value)
      if (hostName) return `${hostName} object`
      let name = 'Object'
      if (!E.isProxyExoticObject(value as never)) {
        const ctor = get(value as unknown as ObjectValue, 'constructor')
        if (isObject(ctor)) {
          const n = get(ctor, 'name')
          if (n instanceof E.JSStringValue && n.stringValue()) name = n.stringValue()
        }
      }
      return `#<${name}>`
    })

  function clone(value: EngineValue, transfer: EngineValue[], iface: 'Window' | 'MessagePort', hooks: CloneHooks, sourcePort?: EngineValue): CloneResult {
    const fail = (detail: string): never => throwDOMException('DataCloneError', failedToExecute('postMessage', iface, detail))

    // Validate the transfer list before anything is copied.
    const seen: EngineValue[] = []
    transfer.forEach((item, index) => {
      if (hooks.isPort(item)) {
        if (item === sourcePort) fail(`Port at index ${index} contains the source port.`)
        if (seen.includes(item)) fail(`Message port at index ${index} is a duplicate of an earlier port.`)
        if (hooks.isNeuteredPort(item)) fail(`Port at index ${index} is already neutered.`)
      } else if (isObject(item) && 'ArrayBufferData' in slots(item) && !hooks.shareBuffer?.(item)) {
        if (seen.includes(item)) fail(`ArrayBuffer at index ${index} is a duplicate of an earlier ArrayBuffer.`)
        if (E.IsDetachedBuffer(item as never)) fail(`ArrayBuffer at index ${index} is already detached.`)
      } else {
        fail(`Value at index ${index} does not have a transferable type.`)
      }
      seen.push(item)
    })

    // Every ArrayBuffer in the transfer list is detached once the copy succeeds, referenced or not.
    const transferredBuffers = transfer.filter((item) => isObject(item) && 'ArrayBufferData' in slots(item) && !hooks.shareBuffer?.(item)) as ObjectValue[]
    const memory = new Map<EngineValue, EngineValue>()
    const ports: ObjectValue[] = []
    const commits: (() => void)[] = []
    for (const item of transfer) {
      if (hooks.isPort(item)) {
        const prepared = hooks.transferPort(item)
        memory.set(item, prepared.port)
        ports.push(prepared.port)
        commits.push(prepared.commit)
      }
    }

    const copy = (v: EngineValue): EngineValue => {
      if (v instanceof E.SymbolValue) fail(`${describeUncloneable(v, hooks)} could not be cloned.`)
      if (!isObject(v)) return v
      const known = memory.get(v)
      if (known) return known
      const s = slots(v)
      if (hooks.isPort(v)) fail('A MessagePort could not be cloned because it was not transferred.')
      if (isCallable(v) || E.isProxyExoticObject(v as never)) fail(`${describeUncloneable(v, hooks)} could not be cloned.`)
      const shared = hooks.shareBuffer?.(v)
      if (shared) return remember(v, shared)
      if ('BooleanData' in s || 'NumberData' in s || 'StringData' in s || 'BigIntData' in s) {
        // engine262 keeps BooleanData / BigIntData as raw JS values, the others as engine values.
        const raw = s.BooleanData ?? s.NumberData ?? s.StringData ?? s.BigIntData
        const primitive =
          typeof raw === 'bigint' ? E.Z(raw) : typeof raw === 'boolean' || typeof raw === 'string' ? E.Value(raw as never) : raw
        return remember(v, run<ObjectValue>(E.ToObject(primitive as never)))
      }
      if ('DateValue' in s) {
        const date = E.OrdinaryObjectCreate(intrinsic('%Date.prototype%') as never, ['DateValue']) as unknown as Slots
        date.DateValue = s.DateValue
        return remember(v, date as unknown as ObjectValue)
      }
      if ('OriginalSource' in s) {
        return remember(v, construct('%RegExp%', [E.Value(s.OriginalSource as string), E.Value(s.OriginalFlags as string)]))
      }
      if ('ArrayBufferData' in s) {
        const bytes = s.ArrayBufferData as Uint8Array | null
        if (bytes === null) fail('An ArrayBuffer is detached and could not be cloned.')
        const args: EngineValue[] = [E.Value(bytes!.length)]
        // A resizable buffer stays resizable.
        if (typeof s.ArrayBufferMaxByteLength === 'number') {
          const options = E.OrdinaryObjectCreate(intrinsic('%Object.prototype%') as never) as unknown as ObjectValue
          run(E.CreateDataProperty(options as never, E.Value('maxByteLength') as never, E.Value(s.ArrayBufferMaxByteLength) as never))
          args.push(options)
        }
        const buffer = construct('%ArrayBuffer%', args)
        ;(slots(buffer).ArrayBufferData as Uint8Array).set(bytes!)
        return remember(v, buffer)
      }
      if ('TypedArrayName' in s && TYPED_ARRAYS.has(s.TypedArrayName as string)) {
        const buffer = copy(s.ViewedArrayBuffer as EngineValue)
        const length = s.ArrayLength === 'auto' ? E.Value.undefined : E.Value(s.ArrayLength as number)
        return remember(v, construct(`%${s.TypedArrayName as string}%`, [buffer, E.Value(s.ByteOffset as number), length]))
      }
      if ('DataView' in s && 'ViewedArrayBuffer' in s) {
        const buffer = copy(s.ViewedArrayBuffer as EngineValue)
        const length = s.ByteLength === 'auto' ? E.Value.undefined : E.Value(s.ByteLength as number)
        return remember(v, construct('%DataView%', [buffer, E.Value(s.ByteOffset as number), length]))
      }
      if ('MapData' in s) {
        const map = remember(v, construct('%Map%', []))
        // Entries are read first, then copied (HTML: a deep copy of [[MapData]]).
        const entries = (s.MapData as { Key?: EngineValue; Value?: EngineValue }[]).filter((r) => r.Key !== undefined)
        const target = slots(map).MapData as { Key: EngineValue; Value: EngineValue }[]
        for (const r of entries.slice()) target.push({ Key: copy(r.Key!), Value: copy(r.Value!) })
        return map
      }
      if ('SetData' in s) {
        const set = remember(v, construct('%Set%', []))
        const values = (s.SetData as (EngineValue | undefined)[]).filter((x) => x !== undefined)
        const target = slots(set).SetData as EngineValue[]
        for (const x of values.slice()) target.push(copy(x!))
        return set
      }
      if ('ErrorData' in s) {
        const nameValue = get(v, 'name')
        const name = nameValue instanceof E.JSStringValue && ERROR_NAMES.has(nameValue.stringValue()) ? nameValue.stringValue() : 'Error'
        const error = E.OrdinaryObjectCreate(intrinsic(`%${name}.prototype%`) as never, ['ErrorData']) as unknown as ObjectValue
        remember(v, error)
        if (run<boolean>(E.HasOwnProperty(v as never, E.Value('message')))) {
          const message = run<string>(E.ToString(get(v, 'message') as never))
          error.properties.set(E.Value('message'), E.Descriptor({ Value: E.Value(message), Writable: true, Enumerable: false, Configurable: true }))
        }
        if (run<boolean>(E.HasOwnProperty(v as never, E.Value('cause')))) {
          error.properties.set(E.Value('cause'), E.Descriptor({ Value: copy(get(v, 'cause')), Writable: true, Enumerable: false, Configurable: true }))
        }
        return error
      }
      if (hooks.interfaceName(v) || hasOtherInternalSlots(s)) fail(`${describeUncloneable(v, hooks)} could not be cloned.`)
      const isArray = E.isArrayExoticObject(v as never)
      const out = remember(
        v,
        isArray
          ? run<ObjectValue>(E.ArrayCreate(run<number>(E.LengthOfArrayLike(v as never))))
          : (E.OrdinaryObjectCreate(intrinsic('%Object.prototype%') as never) as unknown as ObjectValue),
      )
      for (const key of run<EngineValue[]>(E.EnumerableOwnProperties(v as never, 'key'))) {
        const propertyValue = run<EngineValue>(E.Get(v as never, key as never))
        run(E.CreateDataProperty(out as never, key as never, copy(propertyValue) as never))
      }
      return out
    }
    const remember = (from: EngineValue, to: ObjectValue) => {
      memory.set(from, to)
      return to
    }

    const result = copy(value)
    // Transfers take effect on the sending side only once the copy succeeded.
    for (const commit of commits) commit()
    for (const buffer of transferredBuffers) E.DetachArrayBuffer(buffer as never)
    return { value: result, ports }
  }

  return clone
}

/** Exotic or built-in objects other than the ones handled above (WeakMap, Promise, WeakRef...). */
function hasOtherInternalSlots(s: Slots): boolean {
  return [
    'WeakMapData', 'WeakSetData', 'PromiseState', 'WeakRefTarget', 'Cells', 'GeneratorState',
    'AsyncGeneratorState', 'HostData', 'ProxyHandler', 'SymbolData',
  ].some((slot) => slot in s)
}
