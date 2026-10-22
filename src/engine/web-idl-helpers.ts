// Building blocks for host objects (Web IDL interfaces) in an engine262 realm.
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'

export type ObjectValue = InstanceType<typeof E.ObjectValue>
type Realm = InstanceType<typeof E.ManagedRealm>
type RawSteps = Parameters<typeof E.CreateBuiltinFunction>[0]

/** Raised inside native steps to return a ThrowCompletion from deep helpers; `native` catches it. */
export class Abrupt {
  constructor(readonly completion: E.ThrowCompletion) {}
}

const isIterator = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && typeof (value as { next?: unknown }).next === 'function'

/**
 * Runs an engine evaluator to the end (it may call Script code), or takes a completion as is, and
 * unwraps its value or raises Abrupt.
 */
export function run<T>(evaluator: unknown): T {
  const result = isIterator(evaluator) ? E.skipDebugger(evaluator as Parameters<typeof E.skipDebugger>[0]) : evaluator
  const completion = E.EnsureCompletion(result)
  if (completion instanceof E.ThrowCompletion) throw new Abrupt(completion)
  return (completion as { Value: T }).Value
}

/** Raises a TypeError with `message` from native steps. */
export function typeError(message: string): never {
  throw new Abrupt(E.Throw.TypeError(message) as E.ThrowCompletion)
}

export function rangeError(message: string): never {
  throw new Abrupt(E.Throw.RangeError(message) as E.ThrowCompletion)
}

/** Chrome's prefix for errors thrown by a Web IDL operation. */
export const failedToExecute = (operation: string, iface: string, detail: string) =>
  `Failed to execute '${operation}' on '${iface}': ${detail}`

export interface CallContext {
  thisValue: EngineValue
  newTarget: EngineValue
}

/** Native steps: plain JS that may raise Abrupt; returns an engine value (undefined = JS undefined). */
export type Steps = (args: EngineValue[], context: CallContext) => EngineValue | void

/** Wraps steps as engine262 native behaviour: Abrupt becomes the ThrowCompletion it carries. */
function toRawSteps(steps: Steps, isConstructor: boolean): RawSteps {
  const raw = ((args: EngineValue[], context: { thisValue: EngineValue; NewTarget: EngineValue }) => {
    try {
      return steps(args, { thisValue: context.thisValue, newTarget: context.NewTarget }) ?? E.Value.undefined
    } catch (error) {
      if (error instanceof Abrupt) return error.completion
      throw error
    }
  }) as unknown as RawSteps
  if (isConstructor) (raw as unknown as { isConstructor: boolean }).isConstructor = true
  return raw
}

export function makeFunction(realm: Realm, name: string, length: number, steps: Steps, isConstructor = false): ObjectValue {
  return E.CreateBuiltinFunction(toRawSteps(steps, isConstructor), length, name, [], realm) as unknown as ObjectValue
}

export function defineData(
  target: ObjectValue,
  name: string | EngineValue,
  value: EngineValue,
  attributes: { enumerable?: boolean; writable?: boolean; configurable?: boolean } = {},
) {
  target.properties.set(
    (typeof name === 'string' ? E.Value(name) : name) as never,
    E.Descriptor({
      Value: value,
      Enumerable: attributes.enumerable ?? false,
      Writable: attributes.writable ?? true,
      Configurable: attributes.configurable ?? true,
    }),
  )
}

/** A Web IDL operation: enumerable, writable, configurable. */
export function defineMethod(realm: Realm, target: ObjectValue, name: string, length: number, steps: Steps) {
  defineData(target, name, makeFunction(realm, name, length, steps), { enumerable: true })
}

/** A Web IDL attribute: an enumerable accessor; read-only when `set` is absent. */
export function defineAttribute(
  realm: Realm,
  target: ObjectValue,
  name: string,
  get: (thisValue: EngineValue) => EngineValue,
  set?: (thisValue: EngineValue, value: EngineValue) => void,
) {
  const getter = makeFunction(realm, `get ${name}`, 0, (_args, { thisValue }) => get(thisValue))
  const setter = set
    ? makeFunction(realm, `set ${name}`, 1, ([value = E.Value.undefined], { thisValue }) => {
        set(thisValue, value)
      })
    : E.Value.undefined
  target.properties.set(
    E.Value(name),
    E.Descriptor({ Get: getter, Set: setter, Enumerable: true, Configurable: true } as never) as never,
  )
}

/** Something host-side that holds engine values; `gc()` marks through it. */
export interface Markable {
  mark(m: (value: unknown) => void): void
}

/**
 * Creates an object carrying host data in an internal slot. engine262 marks internal slots, so
 * engine values the data holds stay alive as long as the object does (see `Markable`).
 */
export function createHostObject<T extends Markable>(prototype: ObjectValue, data: T): ObjectValue {
  const object = E.OrdinaryObjectCreate(prototype, ['HostData']) as unknown as ObjectValue & { HostData: T }
  object.HostData = data
  return object
}

export function hostDataOf<T>(value: EngineValue, brand: (data: unknown) => data is T): T | undefined {
  if (!(value instanceof E.ObjectValue)) return undefined
  const data = (value as unknown as { HostData?: unknown }).HostData
  return data !== undefined && brand(data) ? data : undefined
}

export interface Interface {
  constructor: ObjectValue
  prototype: ObjectValue
}

/**
 * Defines a Web IDL interface: a constructor and its prototype (with `Symbol.toStringTag`) on
 * `global`. `construct` absent means `new X()` throws Chrome's "Illegal constructor".
 */
export function defineInterface(
  realm: Realm,
  global: ObjectValue,
  name: string,
  options: { parent?: Interface; length?: number; construct?: Steps; expose?: boolean } = {},
): Interface {
  const prototype = E.OrdinaryObjectCreate(
    options.parent?.prototype ?? realm.Intrinsics['%Object.prototype%'],
  ) as unknown as ObjectValue
  const construct: Steps = (args, context) => {
    if (context.newTarget === E.Value.undefined) {
      typeError(`Failed to construct '${name}': Please use the 'new' operator, this DOM object constructor cannot be called as a function.`)
    }
    if (!options.construct) typeError('Illegal constructor')
    return options.construct(args, context)
  }
  const constructor = makeFunction(realm, name, options.length ?? 0, construct, true)
  if (options.parent) (constructor as unknown as { Prototype: ObjectValue }).Prototype = options.parent.constructor
  defineData(constructor, 'prototype', prototype, { writable: false, configurable: false })
  defineData(prototype, 'constructor', constructor)
  defineData(prototype, E.wellKnownSymbols.toStringTag as unknown as EngineValue, E.Value(name), { writable: false })
  if (options.expose !== false) defineData(global, name, constructor)
  return { constructor, prototype }
}

/** The prototype a constructor called with `newTarget` must use (subclasses keep theirs). */
export function prototypeFor(newTarget: EngineValue, fallback: ObjectValue): ObjectValue {
  if (newTarget instanceof E.ObjectValue) {
    const proto = run<EngineValue>(E.Get(newTarget as never, E.Value('prototype')))
    if (proto instanceof E.ObjectValue) return proto as unknown as ObjectValue
  }
  return fallback
}

export const str = (value: string): EngineValue => E.Value(value)
export const num = (value: number): EngineValue => E.Value(value)
export const bool = (value: boolean): EngineValue => (value ? E.Value.true : E.Value.false)

/** WebIDL DOMString conversion (may call Script code). */
export function toDOMString(value: EngineValue): string {
  if (value instanceof E.JSStringValue) return value.stringValue()
  return run<string>(E.ToString(value))
}

/** Reads a property of an options dictionary; undefined when the dictionary is not an object. */
export function member(dictionary: EngineValue | undefined, name: string): EngineValue {
  if (!(dictionary instanceof E.ObjectValue)) return E.Value.undefined
  return run<EngineValue>(E.Get(dictionary as never, E.Value(name)))
}

export const isObject = (value: EngineValue | undefined): value is ObjectValue => value instanceof E.ObjectValue
export const isCallable = (value: EngineValue | undefined): value is ObjectValue =>
  value !== undefined && E.IsCallable(value as never)
