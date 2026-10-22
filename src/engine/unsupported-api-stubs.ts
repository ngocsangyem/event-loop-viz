// Stubs for APIs the simulator does not model: each fails loudly instead of being silently absent.
import * as E from '@engine262/engine262'

type EngineValue = E.Value
type NativeSteps = Parameters<typeof E.CreateBuiltinFunction.from>[0]
type NativeGenerator = (...args: EngineValue[]) => Generator<unknown, unknown, unknown>

const API_PROPERTY = 'unsupportedApi'

/**
 * Global functions that throw when called. All exist in Chrome 155 and schedule work of their own
 * (an idle period, another thread, a socket), which the simulator does not model.
 */
const CALLABLE_APIS = ['requestIdleCallback']
/** Globals that throw when referenced: objects and constructors have no call to hook. */
const REFERENCE_APIS = ['Worker', 'SharedWorker', 'XMLHttpRequest', 'WebSocket']

/** An Error named UnsupportedApiError and tagged with the API so the host can report it. */
export function unsupportedApiError(api: string) {
  const completion = E.Throw.Error(`${api} is not supported by the simulator`)
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
const throwUnsupported = unsupportedApiError

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
}
