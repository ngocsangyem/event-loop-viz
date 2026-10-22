// SharedArrayBuffer and Atomics on a cross-origin isolated page with a single agent (no workers).
import * as E from '@engine262/engine262'
import type { CallbackHandle, HostBindings } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { EngineValue } from './engine262-types'
import type { Invocation } from './host-callbacks'
import {
  defineAttribute,
  defineData,
  makeFunction,
  num,
  prototypeFor,
  rangeError,
  run,
  str,
  typeError,
} from './web-idl-helpers'
import type { Markable, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>
type Slots = {
  TypedArrayName?: string
  ViewedArrayBuffer?: ObjectValue
  ByteOffset?: number
  ArrayLength?: number | 'auto'
  ArrayBufferData?: Uint8Array
}

const INTEGER_TYPES = new Set(['Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'BigInt64Array', 'BigUint64Array'])
const WAITABLE_TYPES = new Set(['Int32Array', 'BigInt64Array'])
const ELEMENT_SIZE: Record<string, number> = {
  Int8Array: 1, Uint8Array: 1, Int16Array: 2, Uint16Array: 2, Int32Array: 4, Uint32Array: 4, BigInt64Array: 8, BigUint64Array: 8,
}

interface Waiter {
  block: Uint8Array
  byteIndex: number
  capability: { Promise: EngineValue; Resolve: EngineValue }
  opId: string
  taskId: string
}

export interface SharedMemoryDeps {
  realm: Realm
  global: ObjectValue
  bindings: HostBindings
  register(invocation: Invocation, info?: CallbackInfo, roots?: Markable): CallbackHandle
  throwUnsupported(api: string): never
}

export function installSharedMemory(deps: SharedMemoryDeps) {
  const { realm, global, bindings } = deps
  const intrinsic = (name: string) => realm.Intrinsics[name as keyof typeof realm.Intrinsics] as unknown as ObjectValue
  /** Shared buffers by their data block: a posted SAB is a new object over the same block. */
  const sharedBlocks = new WeakSet<Uint8Array>()
  const isShared = (value: EngineValue) => {
    const data = (value as unknown as Slots).ArrayBufferData
    return data instanceof Uint8Array && sharedBlocks.has(data)
  }
  const objectName = (value: EngineValue) => {
    const name = (value as unknown as Slots).TypedArrayName
    return name ? `[object ${name}]` : `[object ${value instanceof E.ObjectValue ? 'Object' : typeof value}]`
  }
  const toIndex = (value: EngineValue | undefined) => run<number>(E.ToIndex((value ?? E.Value.undefined) as never))

  // --- SharedArrayBuffer -------------------------------------------------------------------
  const prototype = E.OrdinaryObjectCreate(intrinsic('%Object.prototype%') as never) as unknown as ObjectValue
  const allocate = (byteLength: number, newTarget: EngineValue, block?: Uint8Array): ObjectValue => {
    const buffer = run<ObjectValue>(E.AllocateArrayBuffer(intrinsic('%ArrayBuffer%') as never, byteLength))
    ;(buffer as unknown as { Prototype: ObjectValue }).Prototype = prototypeFor(newTarget, prototype)
    if (block) (buffer as unknown as Slots).ArrayBufferData = block
    sharedBlocks.add((buffer as unknown as Slots).ArrayBufferData!)
    return buffer
  }
  const constructor = makeFunction(
    realm,
    'SharedArrayBuffer',
    1,
    ([length], { newTarget }) => {
      if (newTarget === E.Value.undefined) typeError("Constructor SharedArrayBuffer requires 'new'")
      let byteLength: number
      try {
        byteLength = toIndex(length)
      } catch {
        rangeError('Invalid array buffer length')
      }
      return allocate(byteLength!, newTarget)
    },
    true,
  )
  defineData(constructor, 'prototype', prototype, { writable: false, configurable: false })
  defineData(prototype, 'constructor', constructor)
  defineData(prototype, E.wellKnownSymbols.toStringTag as unknown as EngineValue, str('SharedArrayBuffer'), { writable: false })
  const thisShared = (t: EngineValue, name: string) => {
    if (!isShared(t)) typeError(`Method SharedArrayBuffer.prototype.${name} called on incompatible receiver ${objectName(t)}`)
    return (t as unknown as Slots).ArrayBufferData!
  }
  defineAttribute(realm, prototype, 'byteLength', (t) => num(thisShared(t, 'byteLength').length))
  defineAttribute(realm, prototype, 'maxByteLength', (t) => num(thisShared(t, 'maxByteLength').length))
  defineAttribute(realm, prototype, 'growable', (t) => {
    thisShared(t, 'growable')
    return E.Value.false
  })
  defineData(prototype, 'grow', makeFunction(realm, 'grow', 1, (_a, { thisValue }) => {
    thisShared(thisValue, 'grow')
    typeError('Method SharedArrayBuffer.prototype.grow called on incompatible receiver #<SharedArrayBuffer>')
  }))
  defineData(prototype, 'slice', makeFunction(realm, 'slice', 2, ([start, end], { thisValue }) => {
    const block = thisShared(thisValue, 'slice')
    const relative = (v: EngineValue | undefined, fallback: number) => {
      if (v === undefined || v === E.Value.undefined) return fallback
      const n = run<number>(E.ToIntegerOrInfinity(v as never))
      return n < 0 ? Math.max(block.length + n, 0) : Math.min(n, block.length)
    }
    const from = relative(start, 0)
    const to = relative(end, block.length)
    const copy = allocate(Math.max(to - from, 0), E.Value.undefined)
    ;(copy as unknown as Slots).ArrayBufferData!.set(block.subarray(from, Math.max(from, to)))
    return copy
  }))
  defineData(global, 'SharedArrayBuffer', constructor)

  // --- Atomics -----------------------------------------------------------------------------
  const atomics = E.OrdinaryObjectCreate(intrinsic('%Object.prototype%') as never) as unknown as ObjectValue
  defineData(atomics, E.wellKnownSymbols.toStringTag as unknown as EngineValue, str('Atomics'), { writable: false })
  defineData(global, 'Atomics', atomics)
  const define = (name: string, length: number, steps: Parameters<typeof makeFunction>[3]) =>
    defineData(atomics, name, makeFunction(realm, name, length, steps))

  /** ES ValidateIntegerTypedArray + ValidateAtomicAccess: the typed array and the element index. */
  const validate = (array: EngineValue | undefined, index: EngineValue | undefined, waitable: boolean) => {
    const slots = (array ?? E.Value.undefined) as unknown as Slots
    const type = slots.TypedArrayName
    if (!type || !INTEGER_TYPES.has(type)) typeError(`${objectName(array!)} is not an integer typed array.`)
    if (waitable && !WAITABLE_TYPES.has(type)) typeError(`${objectName(array!)} is not an int32 or BigInt64 typed array.`)
    const length = slots.ArrayLength === 'auto'
      ? (slots.ViewedArrayBuffer as unknown as Slots).ArrayBufferData!.length / ELEMENT_SIZE[type]! - (slots.ByteOffset ?? 0) / ELEMENT_SIZE[type]!
      : (slots.ArrayLength ?? 0)
    let i: number
    try {
      i = toIndex(index)
    } catch {
      rangeError('Invalid atomic access index')
    }
    if (i! >= length) rangeError('Invalid atomic access index')
    return { array: array as ObjectValue, type, index: i!, slots }
  }
  const isBig = (type: string) => type.startsWith('Big')
  /** The element-type conversion of `value` (ToBigInt for BigInt arrays, ToIntegerOrInfinity else). */
  const convert = (type: string, value: EngineValue | undefined) =>
    isBig(type)
      ? E.R(run<EngineValue>(E.ToBigInt((value ?? E.Value.undefined) as never)) as never) as unknown as bigint
      : run<number>(E.ToIntegerOrInfinity((value ?? E.Value.undefined) as never))
  const read = (t: { array: ObjectValue; index: number }) => run<EngineValue>(E.Get(t.array as never, E.Value(String(t.index))))
  const write = (t: { array: ObjectValue; index: number }, value: number | bigint) =>
    run(E.Set(t.array as never, E.Value(String(t.index)), (typeof value === 'bigint' ? E.Z(value) : E.Value(value)) as never, true))
  const raw = (v: EngineValue) => E.R(v as never) as unknown as number | bigint
  /** The value as stored in an element of `type` (wrap-around), using a host typed array. */
  const stored = (type: string, value: number | bigint) => {
    const scratch = new (globalThis as unknown as Record<string, new (n: number) => { [i: number]: number | bigint }>)[type]!(1)
    scratch[0] = value
    return scratch[0]!
  }

  const rmw = (name: string, op: (old: number | bigint, v: number | bigint) => number | bigint) =>
    define(name, 3, ([array, index, value]) => {
      const t = validate(array, index, false)
      // ES: the operand becomes the element type's raw value first; the result wraps on write.
      const v = stored(t.type, convert(t.type, value))
      const old = read(t)
      write(t, op(raw(old), v))
      return old
    })
  // Number elements: bitwise operators work on the 32-bit pattern, which wraps as the element does.
  rmw('add', (a, b) => (typeof a === 'bigint' ? a + (b as bigint) : a + (b as number)))
  rmw('sub', (a, b) => (typeof a === 'bigint' ? a - (b as bigint) : a - (b as number)))
  rmw('and', (a, b) => (typeof a === 'bigint' ? a & (b as bigint) : a & (b as number)))
  rmw('or', (a, b) => (typeof a === 'bigint' ? a | (b as bigint) : a | (b as number)))
  rmw('xor', (a, b) => (typeof a === 'bigint' ? a ^ (b as bigint) : a ^ (b as number)))
  rmw('exchange', (_a, b) => b)
  define('compareExchange', 4, ([array, index, expected, replacement]) => {
    const t = validate(array, index, false)
    const e = convert(t.type, expected)
    const r = convert(t.type, replacement)
    const old = read(t)
    if (raw(old) === stored(t.type, e)) write(t, r)
    return old
  })
  define('load', 2, ([array, index]) => read(validate(array, index, false)))
  define('store', 3, ([array, index, value]) => {
    const t = validate(array, index, false)
    const v = convert(t.type, value)
    write(t, v)
    return typeof v === 'bigint' ? E.Z(v) : E.Value(Object.is(v, -0) ? 0 : v)
  })
  define('isLockFree', 1, ([size]) => {
    const n = run<number>(E.ToIntegerOrInfinity((size ?? E.Value.undefined) as never))
    return n === 1 || n === 2 || n === 4 || n === 8 ? E.Value.true : E.Value.false
  })
  define('pause', 0, () => E.Value.undefined)

  const waiters: Waiter[] = []
  /** The bytes and byte index a wait or notify targets. */
  const location = (t: ReturnType<typeof validate>) => ({
    block: (t.slots.ViewedArrayBuffer as unknown as Slots).ArrayBufferData!,
    byteIndex: (t.slots.ByteOffset ?? 0) + t.index * ELEMENT_SIZE[t.type]!,
  })
  const requireShared = (t: ReturnType<typeof validate>) => {
    if (!isShared(t.slots.ViewedArrayBuffer as unknown as EngineValue)) typeError(`${objectName(t.array)} is not a shared typed array.`)
  }
  /** Timeout argument: undefined and NaN mean wait forever; negative means 0. */
  const timeoutOf = (value: EngineValue | undefined) => {
    if (value === undefined || value === E.Value.undefined) return Infinity
    const n = E.R(run<EngineValue>(E.ToNumber(value as never)) as never) as unknown as number
    return Number.isNaN(n) ? Infinity : Math.max(n, 0)
  }

  // The window's agent cannot block (HTML: [[CanBlock]] is false for similar-origin window agents).
  define('wait', 4, ([array, index, value, timeout]) => {
    const t = validate(array, index, true)
    requireShared(t)
    convert(t.type, value)
    timeoutOf(timeout)
    typeError('Atomics.wait cannot be called in this context')
  })

  const result = (isAsync: boolean, value: EngineValue) => {
    const object = E.OrdinaryObjectCreate(intrinsic('%Object.prototype%') as never) as unknown as ObjectValue
    defineData(object, 'async', isAsync ? E.Value.true : E.Value.false, { enumerable: true })
    defineData(object, 'value', value, { enumerable: true })
    return object
  }
  define('waitAsync', 4, ([array, index, value, timeout]) => {
    const t = validate(array, index, true)
    requireShared(t)
    const v = convert(t.type, value)
    const ms = timeoutOf(timeout)
    if (raw(read(t)) !== stored(t.type, v)) return result(false, str('not-equal'))
    if (ms === 0) return result(false, str('timed-out'))
    // Chrome resolves a finite timeout about 5 ms late, for reasons not pinned down: not modelled.
    if (ms !== Infinity) deps.throwUnsupported('Atomics.waitAsync with a timeout')
    const capability = run<{ Promise: EngineValue; Resolve: EngineValue }>(E.NewPromiseCapability(intrinsic('%Promise%') as never))
    const { opId, taskId } = bindings.startWebApi({ api: 'waitAsync', detail: `${t.type}[${t.index}]`, callback: { kind: 'builtin', name: 'Atomics.waitAsync' } })
    waiters.push({ ...location(t), capability, opId, taskId })
    return result(true, capability.Promise)
  })
  define('notify', 3, ([array, index, count]) => {
    const t = validate(array, index, true)
    let limit = count === undefined || count === E.Value.undefined ? Infinity : Math.max(run<number>(E.ToIntegerOrInfinity(count as never)), 0)
    if (!isShared(t.slots.ViewedArrayBuffer as unknown as EngineValue)) return num(0)
    const { block, byteIndex } = location(t)
    let woken = 0
    for (const waiter of waiters.slice()) {
      if (limit <= 0) break
      if (waiter.block !== block || waiter.byteIndex !== byteIndex) continue
      waiters.splice(waiters.indexOf(waiter), 1)
      limit--
      woken++
      // The wake settles in a Task of its own (HTML HostEnqueueGenericJob), queued now.
      const handle = deps.register(
        {
          kind: 'steps',
          steps: (caller) =>
            caller.internal(() => E.Call(waiter.capability.Resolve as never, E.Value.undefined, [str('ok')] as never)),
        },
        { kind: 'builtin', name: 'Atomics.waitAsync' },
        { mark: (m) => [waiter.capability.Promise, waiter.capability.Resolve].forEach(m) },
      )
      bindings.queueTask('javascript-engine', handle, { opId: waiter.opId, taskId: waiter.taskId })
    }
    return num(woken)
  })

  return {
    /** For postMessage: a SharedArrayBuffer is shared, not copied (a new object over the same bytes). */
    shareBuffer(value: EngineValue): ObjectValue | undefined {
      if (!isShared(value)) return undefined
      const block = (value as unknown as Slots).ArrayBufferData!
      return allocate(block.length, E.Value.undefined, block)
    },
    /** Pending waitAsync promises are GC roots while they wait. */
    mark(m: (value: unknown) => void) {
      for (const w of waiters) {
        m(w.capability.Promise)
        m(w.capability.Resolve)
      }
    },
  }
}
