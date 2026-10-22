// Members of Element, HTMLElement and Text: attributes, selectors, innerHTML, classList, click().
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'
import type { DocumentDeps } from './dom-document-global'
import { matches, nodeDataOf, parseSelector, serializeChildren, serializeNode } from './dom-node-tree'
import type { NodeData, ParsedSelector } from './dom-node-tree'
import { installDomTokenList } from './dom-token-list'
import { bool, defineAttribute, failedToExecute, num, str, toDOMString, typeError } from './web-idl-helpers'
import type { Interface, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>
type Method = (
  target: ObjectValue,
  name: string,
  length: number,
  steps: (n: NodeData, args: EngineValue[], self: ObjectValue) => EngineValue | void,
  iface?: string,
) => void

/** Form controls a `disabled` attribute turns off: click() then does nothing. */
const DISABLEABLE = new Set(['button', 'input', 'select', 'textarea'])
const VALID_NAME = /^[A-Za-z][^\0\t\n\f\r />]*$/

/** What the document installer shares with the element members. */
export interface ElementMembersContext {
  realm: Realm
  global: ObjectValue
  deps: DocumentDeps
  interfaces: { Element: Interface; HTMLElement: Interface; CharacterData: Interface }
  nodeOf(value: EngineValue, operation: string, iface?: string): NodeData
  method: Method
  requireArgs(operation: string, args: EngineValue[], count: number, iface?: string): void
  setTextContent(n: NodeData, self: ObjectValue, text: string): void
}

export function installElementMembers(ctx: ElementMembersContext) {
  const { realm, global, deps, nodeOf, method, requireArgs, setTextContent } = ctx
  const { Element, HTMLElement, CharacterData } = ctx.interfaces
  const { targets } = deps
  // --- Element -----------------------------------------------------------------------------
  const elementOf = (t: EngineValue, operation: string) => {
    const n = nodeOf(t, operation, 'Element')
    if (n.kind !== 'element') typeError(failedToExecute(operation, 'Element', 'Illegal invocation'))
    return n
  }
  const elementAttr = (name: string, get: (n: NodeData, self: ObjectValue) => EngineValue, set?: (n: NodeData, v: EngineValue, self: ObjectValue) => void) =>
    defineAttribute(realm, Element.prototype, name, (t) => get(elementOf(t, name), t as ObjectValue), set && ((t, v) => set(elementOf(t, name), v, t as ObjectValue)))
  const reflect = (property: string, attribute: string) =>
    elementAttr(property, (n) => str(n.attributes.get(attribute) ?? ''), (n, v) => {
      n.attributes.set(attribute, toDOMString(v))
    })
  elementAttr('tagName', (n) => str(n.localName.toUpperCase()))
  elementAttr('localName', (n) => str(n.localName))
  reflect('id', 'id')
  reflect('className', 'class')
  elementAttr('innerHTML', (_n, self) => str(serializeChildren(self)), (n, v, self) => {
    const html = v === E.Value.null ? '' : toDOMString(v)
    // Without an HTML parser only plain text can be set; markup fails loudly instead.
    if (/[<&]/.test(html)) deps.throwUnsupported('innerHTML (markup)')
    setTextContent(n, self, html)
  })
  elementAttr('outerHTML', (_n, self) => str(serializeNode(self)))
  const attributeName = (args: EngineValue[], operation: string, count: number) => {
    requireArgs(operation, args, count, 'Element')
    return toDOMString(args[0]!).toLowerCase()
  }
  method(Element.prototype, 'getAttribute', 1, (n, args) => {
    const value = n.attributes.get(attributeName(args, 'getAttribute', 1))
    return value === undefined ? E.Value.null : str(value)
  }, 'Element')
  method(Element.prototype, 'setAttribute', 2, (n, args) => {
    const name = attributeName(args, 'setAttribute', 2)
    if (!VALID_NAME.test(name)) {
      deps.throwDOMException('InvalidCharacterError', failedToExecute('setAttribute', 'Element', `'${name}' is not a valid attribute name.`))
    }
    n.attributes.set(name, toDOMString(args[1]!))
  }, 'Element')
  method(Element.prototype, 'removeAttribute', 1, (n, args) => {
    n.attributes.delete(attributeName(args, 'removeAttribute', 1))
  }, 'Element')
  method(Element.prototype, 'hasAttribute', 1, (n, args) => bool(n.attributes.has(attributeName(args, 'hasAttribute', 1))), 'Element')
  method(Element.prototype, 'matches', 1, (_n, args, self) => {
    const text = toDOMString(args[0] ?? E.Value.undefined)
    const parsed = parseSelector(text)
    if (parsed === 'invalid') deps.throwDOMException('SyntaxError', failedToExecute('matches', 'Element', `'${text}' is not a valid selector.`))
    if (parsed === 'unsupported') deps.throwUnsupported(`matches('${text}')`)
    return bool(matches(self, parsed as ParsedSelector))
  }, 'Element')
  const tokenLists = installDomTokenList(realm, global, (element) => nodeDataOf(element)!.attributes)
  elementAttr('classList', (_n, self) => tokenLists.forElement(self))

  // --- HTMLElement -------------------------------------------------------------------------
  targets.defineEventHandler(HTMLElement.prototype, 'click')
  defineAttribute(
    realm,
    HTMLElement.prototype,
    'disabled',
    (t) => bool(elementOf(t, 'disabled').attributes.has('disabled')),
    (t, v) => {
      const n = elementOf(t, 'disabled')
      if (E.ToBoolean(v as never)) n.attributes.set('disabled', '')
      else n.attributes.delete('disabled')
    },
  )
  // HTML click(): a synthetic, untrusted PointerEvent dispatched synchronously on the stack.
  method(HTMLElement.prototype, 'click', 0, (n, _args, self) => {
    if (DISABLEABLE.has(n.localName) && n.attributes.has('disabled')) return
    if (n.clickInProgress) return
    n.clickInProgress = true
    try {
      const event = deps.events.create(deps.events.PointerEvent, 'click', { bubbles: true, cancelable: true, composed: true }, { detail: num(0) }, false)
      targets.dispatch(self, event, deps.syncCall)
    } finally {
      n.clickInProgress = false
    }
  }, 'HTMLElement')

  // --- Text ------------------------------------------------------------------------------
  const textOf = (t: EngineValue, operation: string) => {
    const n = nodeOf(t, operation, 'CharacterData')
    if (n.kind !== 'text') typeError(failedToExecute(operation, 'CharacterData', 'Illegal invocation'))
    return n
  }
  defineAttribute(realm, CharacterData.prototype, 'data', (t) => str(textOf(t, 'data').data), (t, v) => {
    textOf(t, 'data').data = v === E.Value.null ? '' : toDOMString(v)
  })
  defineAttribute(realm, CharacterData.prototype, 'length', (t) => num(textOf(t, 'length').data.length))
}
