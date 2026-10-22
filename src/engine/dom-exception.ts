// DOMException: the error Web APIs throw (DataCloneError, InvalidStateError, ...).
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'
import {
  Abrupt,
  createHostObject,
  defineAttribute,
  defineData,
  defineInterface,
  hostDataOf,
  num,
  prototypeFor,
  str,
  toDOMString,
  typeError,
} from './web-idl-helpers'
import type { ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

/** Legacy `code` of the names this simulator throws (WebIDL DOMException names table). */
const LEGACY_CODES: Readonly<Record<string, number>> = {
  IndexSizeError: 1,
  HierarchyRequestError: 3,
  WrongDocumentError: 4,
  InvalidCharacterError: 5,
  NotFoundError: 8,
  NotSupportedError: 9,
  InvalidStateError: 11,
  SyntaxError: 12,
  InvalidAccessError: 15,
  TypeMismatchError: 17,
  SecurityError: 18,
  NetworkError: 19,
  AbortError: 20,
  DataCloneError: 25,
}

class DOMExceptionData {
  constructor(
    readonly name: string,
    readonly message: string,
  ) {}
  mark() {}
}
const isDOMExceptionData = (d: unknown): d is DOMExceptionData => d instanceof DOMExceptionData

export type ThrowDOMException = (name: string, message: string) => never

/** Installs DOMException (its prototype inherits Error.prototype) and returns a thrower for native steps. */
export function installDOMException(realm: Realm, global: ObjectValue): ThrowDOMException {
  const iface = defineInterface(realm, global, 'DOMException', {
    length: 0,
    construct([message = E.Value.undefined, name = E.Value.undefined], { newTarget }) {
      const data = new DOMExceptionData(
        name === E.Value.undefined ? 'Error' : toDOMString(name),
        message === E.Value.undefined ? '' : toDOMString(message),
      )
      return createHostObject(prototypeFor(newTarget, iface.prototype), data)
    },
  })
  ;(iface.prototype as unknown as { Prototype: ObjectValue }).Prototype = realm.Intrinsics['%Error.prototype%'] as unknown as ObjectValue
  const read = (thisValue: EngineValue) => hostDataOf(thisValue, isDOMExceptionData) ?? typeError('Illegal invocation')
  defineAttribute(realm, iface.prototype, 'name', (t) => str(read(t).name))
  defineAttribute(realm, iface.prototype, 'message', (t) => str(read(t).message))
  defineAttribute(realm, iface.prototype, 'code', (t) => num(LEGACY_CODES[read(t).name] ?? 0))
  for (const [name, code] of Object.entries(LEGACY_CODES)) {
    const constant = name.replace(/Error$/, '').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase() + '_ERR'
    defineData(iface.constructor, constant, num(code), { enumerable: true, writable: false, configurable: false })
  }

  return (name, message) => {
    throw new Abrupt(E.ThrowCompletion(createHostObject(iface.prototype, new DOMExceptionData(name, message))) as never)
  }
}
