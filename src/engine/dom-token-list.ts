// DOMTokenList for `element.classList`: a view over the element's `class` attribute.
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'
import {
  bool,
  createHostObject,
  defineAttribute,
  defineInterface,
  defineMethod,
  failedToExecute,
  hostDataOf,
  num,
  str,
  toDOMString,
  typeError,
} from './web-idl-helpers'
import type { ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

class TokenListData {
  constructor(
    readonly element: ObjectValue,
    readonly attributes: Map<string, string>,
  ) {}
  get tokens(): string[] {
    return [...new Set((this.attributes.get('class') ?? '').split(/\s+/).filter(Boolean))]
  }
  set tokens(list: string[]) {
    this.attributes.set('class', list.join(' '))
  }
  mark(m: (value: unknown) => void) {
    m(this.element)
  }
}
const isTokenListData = (d: unknown): d is TokenListData => d instanceof TokenListData

export function installDomTokenList(realm: Realm, global: ObjectValue, attributesOf: (element: ObjectValue) => Map<string, string>) {
  const iface = defineInterface(realm, global, 'DOMTokenList')
  const listOf = (t: EngineValue, operation: string) =>
    hostDataOf(t, isTokenListData) ?? typeError(failedToExecute(operation, 'DOMTokenList', 'Illegal invocation'))
  const p = iface.prototype
  defineAttribute(realm, p, 'length', (t) => num(listOf(t, 'length').tokens.length))
  defineAttribute(realm, p, 'value', (t) => str(listOf(t, 'value').attributes.get('class') ?? ''))
  defineMethod(realm, p, 'contains', 1, (args, { thisValue }) =>
    bool(listOf(thisValue, 'contains').tokens.includes(toDOMString(args[0] ?? E.Value.undefined))),
  )
  defineMethod(realm, p, 'add', 0, (args, { thisValue }) => {
    const data = listOf(thisValue, 'add')
    data.tokens = [...data.tokens, ...args.map(toDOMString)]
  })
  defineMethod(realm, p, 'remove', 0, (args, { thisValue }) => {
    const data = listOf(thisValue, 'remove')
    const removed = new Set(args.map(toDOMString))
    data.tokens = data.tokens.filter((t) => !removed.has(t))
  })
  defineMethod(realm, p, 'toggle', 1, (args, { thisValue }) => {
    const data = listOf(thisValue, 'toggle')
    const token = toDOMString(args[0] ?? E.Value.undefined)
    const force = args[1] === undefined || args[1] === E.Value.undefined ? undefined : E.ToBoolean(args[1] as never)
    const has = data.tokens.includes(token)
    const next = force ?? !has
    if (next && !has) data.tokens = [...data.tokens, token]
    if (!next && has) data.tokens = data.tokens.filter((t) => t !== token)
    return bool(next)
  })
  defineMethod(realm, p, 'toString', 0, (_args, { thisValue }) => str(listOf(thisValue, 'toString').attributes.get('class') ?? ''))

  // [SameObject]: one list per element.
  const lists = new WeakMap<ObjectValue, ObjectValue>()
  return {
    forElement(element: ObjectValue): ObjectValue {
      let list = lists.get(element)
      if (!list) lists.set(element, (list = createHostObject(p, new TokenListData(element, attributesOf(element)))))
      return list
    },
  }
}
