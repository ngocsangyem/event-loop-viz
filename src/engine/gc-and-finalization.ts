// gc(), WeakRef kept objects and FinalizationRegistry cleanup, on the HTML schedule.
import * as E from '@engine262/engine262'
import type { CallbackHandle, HostBindings } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { EngineValue } from './engine262-types'
import type { Invocation } from './host-callbacks'
import { defineData, makeFunction } from './web-idl-helpers'
import type { Markable, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

interface FinalizationRegistrySlots {
  Cells: { WeakRefTarget: unknown; HeldValue: EngineValue; UnregisterToken: unknown }[]
  CleanupCallback: { Callback: EngineValue }
}

/**
 * WeakRef targets created or dereferenced stay alive until the microtask checkpoint ends (HTML
 * perform a microtask checkpoint: ClearKeptObjects is its last step). engine262 clears them after
 * every job; this keeps one set the host clears instead.
 */
export function holdKeptObjectsUntilCheckpoint(agent: InstanceType<typeof E.Agent>): { clear(): void } {
  const kept = new Set<unknown>()
  Object.defineProperty(agent.AgentRecord, 'KeptAlive', {
    get: () => kept,
    // engine262's per-job ClearKeptObjects assigns a new set; the checkpoint clears this one.
    set: () => {},
    configurable: true,
  })
  return { clear: () => kept.clear() }
}

export interface FinalizationDeps {
  realm: Realm
  global: ObjectValue
  bindings: HostBindings
  register(invocation: Invocation, info?: CallbackInfo, roots?: Markable): CallbackHandle
  describe(fn: EngineValue): CallbackInfo | undefined
  reportError(error: EngineValue): void
}

/**
 * `gc()` (Chrome exposes it with --js-flags=--expose-gc) collects over the realm plus everything
 * the host holds. A registry with collected cells queues one cleanup Task on the JavaScript engine
 * task source at once; the Task calls the cleanup callbacks back to back, most recently registered
 * first (Chrome 155, two cells). A throw is reported and ends the Task; the remaining cells get a
 * new one, so microtasks run in between.
 */
export function installFinalization(deps: FinalizationDeps) {
  const scheduled = new Set<object>()

  defineData(
    deps.global,
    'gc',
    makeFunction(deps.realm, 'gc', 0, () => {
      collectGarbage(enqueueCleanup)
    }),
  )

  function enqueueCleanup(registry: object) {
    if (scheduled.has(registry)) return
    scheduled.add(registry)
    const slots = registry as unknown as FinalizationRegistrySlots
    const callback = slots.CleanupCallback.Callback
    const handle = deps.register(
      {
        kind: 'steps',
        steps: (caller) => {
          scheduled.delete(registry)
          let threw = false
          caller.internal(function* () {
            for (let i = slots.Cells.length - 1; i >= 0; i--) {
              const cell = slots.Cells[i]!
              if (cell.WeakRefTarget !== undefined) continue
              slots.Cells.splice(i, 1)
              const completion = yield* E.Call(callback as never, E.Value.undefined, [cell.HeldValue] as never)
              if (completion instanceof E.ThrowCompletion) {
                // CleanupFinalizationRegistry stops at a throw (`?`); Chrome cleans the rest in a new Task.
                deps.reportError(completion.Value as EngineValue)
                threw = true
                break
              }
            }
            return E.Value.undefined
          })
          if (threw && slots.Cells.some((cell) => cell.WeakRefTarget === undefined)) enqueueCleanup(registry)
        },
      },
      deps.describe(callback),
      { mark: (m) => m(registry) },
    )
    deps.bindings.queueTask('javascript-engine', handle)
  }

  return { enqueueCleanup }
}

type Mark = (value: unknown) => void
interface WeakRefLike { WeakRefTarget: unknown; properties: unknown; Prototype: unknown }
interface WeakMapLike { WeakMapData: { Key: unknown; Value: unknown }[]; properties: unknown; Prototype: unknown }
interface WeakSetLike { WeakSetData: unknown[]; properties: unknown; Prototype: unknown }
interface RegistryLike extends FinalizationRegistrySlots { properties: unknown; Prototype: unknown }

/**
 * ECMAScript "weak references" execution steps over the realm: mark everything reachable from the
 * agent (its job queue also marks what the host holds), then empty the WeakRefs, FinalizationRegistry
 * cells, WeakMap and WeakSet entries whose target was not reached, and queue cleanup for registries
 * with emptied cells. engine262's own `gc()` follows only objects with a `mark` method, so it never
 * reaches the values of a declarative environment's `bindings` Map (`let` / `const`); this walk also
 * follows Maps, Sets, Arrays and plain records.
 */
export function collectGarbage(enqueueCleanup: (registry: object) => void) {
  const marked = new Set<unknown>()
  const pending: object[] = []
  const weakRefs: WeakRefLike[] = []
  const registries: RegistryLike[] = []
  const weakMaps: WeakMapLike[] = []
  const weakSets: WeakSetLike[] = []
  const mark: Mark = (value) => {
    if (typeof value !== 'object' || value === null || marked.has(value)) return
    marked.add(value)
    pending.push(value)
  }
  const visit = (o: object) => {
    const slots = o as Record<string, unknown>
    if ('WeakRefTarget' in slots) {
      weakRefs.push(o as WeakRefLike)
      mark(slots.properties)
      mark(slots.Prototype)
    } else if ('Cells' in slots && 'CleanupCallback' in slots) {
      const registry = o as RegistryLike
      registries.push(registry)
      mark(registry.properties)
      mark(registry.Prototype)
      mark(registry.CleanupCallback)
      for (const cell of registry.Cells) mark(cell.HeldValue)
    } else if ('WeakMapData' in slots) {
      weakMaps.push(o as WeakMapLike)
      mark(slots.properties)
      mark(slots.Prototype)
    } else if ('WeakSetData' in slots) {
      weakSets.push(o as WeakSetLike)
      mark(slots.properties)
      mark(slots.Prototype)
    } else if (typeof (o as { mark?: unknown }).mark === 'function') {
      ;(o as { mark(m: Mark): void }).mark(mark)
      // A pending promise's reactions (await continuations, then callbacks) are not in its mark().
      if ('PromiseState' in slots) {
        mark(slots.PromiseFulfillReactions)
        mark(slots.PromiseRejectReactions)
        mark(slots.PromiseResult)
      }
    } else if (o instanceof Map) {
      o.forEach((value, key) => {
        mark(key)
        mark(value)
      })
    } else if (o instanceof Set || Array.isArray(o)) {
      o.forEach(mark)
    } else {
      // Any other record (a promise reaction, a capability, a job callback): follow every field.
      // Marking too much only keeps an object alive longer, which the spec allows; too little
      // would empty a WeakRef whose target is still reachable.
      Object.values(o).forEach(mark)
    }
  }
  const drain = () => {
    while (pending.length > 0) visit(pending.pop()!)
  }

  mark(E.surroundingAgent)
  drain()
  // Ephemerons: a WeakMap value is reachable only through a reachable key.
  for (let changed = true; changed; ) {
    changed = false
    for (const map of weakMaps) {
      for (const record of map.WeakMapData) {
        if (record.Key !== undefined && marked.has(record.Key) && !marked.has(record.Value)) {
          mark(record.Value)
          changed = true
        }
      }
    }
    drain()
  }

  for (const ref of weakRefs) if (!marked.has(ref.WeakRefTarget)) ref.WeakRefTarget = undefined
  for (const registry of registries) {
    let emptied = false
    for (const cell of registry.Cells) {
      if (cell.WeakRefTarget !== undefined && !marked.has(cell.WeakRefTarget)) {
        cell.WeakRefTarget = undefined
        emptied = true
      }
    }
    if (emptied) enqueueCleanup(registry)
  }
  for (const map of weakMaps) {
    for (const record of map.WeakMapData) {
      if (record.Key !== undefined && !marked.has(record.Key)) {
        record.Key = undefined
        record.Value = undefined
      }
    }
  }
  for (const set of weakSets) {
    set.WeakSetData.forEach((value, i) => {
      if (value !== undefined && !marked.has(value)) set.WeakSetData[i] = undefined
    })
  }
}

