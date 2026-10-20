// Stubs for APIs outside the v1 scope: each fails loudly instead of being silently absent.
import * as E from '@engine262/engine262'

type EngineValue = E.Value
type NativeSteps = Parameters<typeof E.CreateBuiltinFunction.from>[0]
type NativeGenerator = (...args: EngineValue[]) => Generator<unknown, unknown, unknown>

const API_PROPERTY = 'unsupportedApi'

/** Global functions that throw when called. */
const CALLABLE_APIS = ['fetch', 'requestAnimationFrame', 'addEventListener', 'postMessage']
/** Globals that throw when referenced: objects and constructors have no call to hook. */
const REFERENCE_APIS = ['document', 'window', 'FinalizationRegistry', 'WeakRef', 'SharedArrayBuffer']

/** Throws an Error named UnsupportedApiError and tagged with the API so the host can report it. */
function throwUnsupported(api: string) {
  const completion = E.Throw.Error(`${api} is not supported in v1`)
  const error = completion.Value as InstanceType<typeof E.ObjectValue>
  const define = (name: string, value: EngineValue) =>
    error.properties.set(
      E.Value(name),
      E.Descriptor({ Configurable: true, Enumerable: false, Writable: true, Value: value }),
    )
  define('name', E.Value('UnsupportedApiError'))
  define(API_PROPERTY, E.Value(api))
  return completion
}

/** The API an engine error object is tagged with, or undefined for an ordinary error. */
export function unsupportedApiOf(error: EngineValue): string | undefined {
  if (!(error instanceof E.ObjectValue)) return undefined
  const value = error.properties.get(E.Value(API_PROPERTY))?.Value
  return value instanceof E.JSStringValue ? value.stringValue() : undefined
}

function throwingFunction(api: string): InstanceType<typeof E.ObjectValue> {
  const steps: NativeGenerator = function* () {
    return throwUnsupported(api)
  }
  Object.defineProperty(steps, 'name', { value: api })
  return E.CreateBuiltinFunction.from(steps as unknown as NativeSteps, api)
}

/** Must run inside the host context so builtin creation has an execution context. */
export function installUnsupportedApiStubs(realm: InstanceType<typeof E.ManagedRealm>): void {
  const global = realm.GlobalObject
  for (const api of CALLABLE_APIS) {
    global.properties.set(
      E.Value(api),
      E.Descriptor({ Configurable: true, Enumerable: false, Writable: true, Value: throwingFunction(api) }),
    )
  }
  for (const api of REFERENCE_APIS) {
    global.properties.set(
      E.Value(api),
      E.Descriptor({
        Configurable: true,
        Enumerable: false,
        Get: throwingFunction(api),
        Set: E.Value.undefined,
      } as unknown as Parameters<typeof E.Descriptor>[0]) as unknown as Parameters<
        typeof global.properties.set
      >[1],
    )
  }
  // engine262 ships no Atomics; a namespace holding only the stub keeps `Atomics.wait` reporting by name.
  let atomics = global.properties.get(E.Value('Atomics'))?.Value
  if (!(atomics instanceof E.ObjectValue)) {
    atomics = E.OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%'])
    global.properties.set(
      E.Value('Atomics'),
      E.Descriptor({ Configurable: true, Enumerable: false, Writable: true, Value: atomics }),
    )
  }
  ;(atomics as InstanceType<typeof E.ObjectValue>).properties.set(
    E.Value('wait'),
    E.Descriptor({
      Configurable: true,
      Enumerable: false,
      Writable: true,
      Value: throwingFunction('Atomics.wait'),
    }),
  )
}
