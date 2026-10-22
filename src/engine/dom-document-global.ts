// `document` and the DOM interfaces a Script reaches through it: Node, Element, HTMLElement and its
// per-tag subclasses, Text, Document. The page is the Oracle's: <html><head></head><body><script>.
import * as E from '@engine262/engine262'
import type { EngineValue } from './engine262-types'
import type { EventInterfaces } from './event-objects'
import type { CallListener, EventTargets } from './event-target'
import type { ThrowDOMException } from './dom-exception'
import {
  NodeData,
  descendantElements,
  insertChild,
  isElement,
  isInclusiveAncestor,
  matches,
  nodeDataOf,
  parseSelector,
  removeFromParent,
  textContentOf,
} from './dom-node-tree'
import type { NodeKind, ParsedSelector } from './dom-node-tree'
import { installElementMembers } from './dom-element-members'
import {
  bool,
  createHostObject,
  defineAttribute,
  defineData,
  defineInterface,
  defineMethod,
  failedToExecute,
  num,
  str,
  toDOMString,
  typeError,
} from './web-idl-helpers'
import type { Interface, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>

/** Interface of each tag Chrome 155 maps to its own HTMLxxxElement. */
const TAG_INTERFACES: Readonly<Record<string, string>> = {
  a: 'HTMLAnchorElement', body: 'HTMLBodyElement', br: 'HTMLBRElement', button: 'HTMLButtonElement',
  canvas: 'HTMLCanvasElement', div: 'HTMLDivElement', form: 'HTMLFormElement', h1: 'HTMLHeadingElement',
  h2: 'HTMLHeadingElement', h3: 'HTMLHeadingElement', h4: 'HTMLHeadingElement', h5: 'HTMLHeadingElement',
  h6: 'HTMLHeadingElement', head: 'HTMLHeadElement', hr: 'HTMLHRElement', html: 'HTMLHtmlElement',
  img: 'HTMLImageElement', input: 'HTMLInputElement', label: 'HTMLLabelElement', li: 'HTMLLIElement',
  ol: 'HTMLOListElement', option: 'HTMLOptionElement', p: 'HTMLParagraphElement', pre: 'HTMLPreElement',
  script: 'HTMLScriptElement', select: 'HTMLSelectElement', span: 'HTMLSpanElement', table: 'HTMLTableElement',
  textarea: 'HTMLTextAreaElement', ul: 'HTMLUListElement',
}
/** Elements whose interface is plain HTMLElement. */
const PLAIN_HTML_ELEMENTS = new Set([
  'abbr', 'article', 'aside', 'b', 'code', 'em', 'footer', 'header', 'i', 'main', 'mark', 'nav', 'section',
  'small', 'strong', 'sub', 'summary', 'sup', 'u',
])
const VALID_NAME = /^[A-Za-z][^\0\t\n\f\r />]*$/

export interface DocumentDeps {
  realm: Realm
  global: ObjectValue
  events: EventInterfaces
  targets: EventTargets
  throwDOMException: ThrowDOMException
  throwUnsupported(api: string): never
  syncCall: CallListener
  /** True while the Script's own Task runs (readyState `loading`, currentScript set). */
  scriptRunning(): boolean
}

export function installDocument(deps: DocumentDeps): ObjectValue {
  const { realm, global, targets } = deps
  const nodeOf = (value: EngineValue, operation: string, iface = 'Node'): NodeData =>
    nodeDataOf(value) ?? typeError(failedToExecute(operation, iface, 'Illegal invocation'))
  const nodeArg = (value: EngineValue | undefined, operation: string, iface = 'Node', index = 1): ObjectValue => {
    if (!value || !nodeDataOf(value)) typeError(failedToExecute(operation, iface, `parameter ${index} is not of type 'Node'.`))
    return value as ObjectValue
  }

  const Node = defineInterface(realm, global, 'Node', { parent: targets.EventTarget })
  const Element = defineInterface(realm, global, 'Element', { parent: Node })
  const HTMLElement = defineInterface(realm, global, 'HTMLElement', { parent: Element })
  const CharacterData = defineInterface(realm, global, 'CharacterData', { parent: Node })
  const Text: Interface = defineInterface(realm, global, 'Text', {
    parent: CharacterData,
    construct: ([data = E.Value.undefined]) => create('text', '#text', data === E.Value.undefined ? '' : toDOMString(data)),
  })
  const Document = defineInterface(realm, global, 'Document', { parent: Node })
  const HTMLDocument = defineInterface(realm, global, 'HTMLDocument', { parent: Document })
  const DocumentType = defineInterface(realm, global, 'DocumentType', { parent: Node })
  const tagInterfaces = new Map<string, Interface>()
  for (const name of new Set([...Object.values(TAG_INTERFACES), 'HTMLUnknownElement'])) {
    tagInterfaces.set(name, defineInterface(realm, global, name, { parent: HTMLElement }))
  }

  function create(kind: NodeKind, localName: string, data = ''): ObjectValue {
    const prototype =
      kind === 'text'
        ? Text.prototype
        : kind === 'document'
          ? HTMLDocument.prototype
          : kind === 'doctype'
            ? DocumentType.prototype
            : interfaceForTag(localName).prototype
    return createHostObject(prototype, new NodeData(kind, localName, data, () => global))
  }
  function interfaceForTag(localName: string): Interface {
    const name = TAG_INTERFACES[localName]
    if (name) return tagInterfaces.get(name)!
    if (PLAIN_HTML_ELEMENTS.has(localName) || localName.includes('-')) return HTMLElement
    return tagInterfaces.get('HTMLUnknownElement')!
  }

  // --- Node ------------------------------------------------------------------------------
  const NODE_TYPES: Record<NodeKind, number> = { element: 1, text: 3, document: 9, doctype: 10 }
  for (const [name, value] of [['ELEMENT_NODE', 1], ['TEXT_NODE', 3], ['DOCUMENT_NODE', 9], ['DOCUMENT_TYPE_NODE', 10]] as const) {
    defineData(Node.prototype, name, num(value), { enumerable: true, writable: false, configurable: false })
    defineData(Node.constructor, name, num(value), { enumerable: true, writable: false, configurable: false })
  }
  const nodeAttr = (name: string, get: (n: NodeData, self: ObjectValue) => EngineValue, set?: (n: NodeData, v: EngineValue, self: ObjectValue) => void) =>
    defineAttribute(
      realm,
      Node.prototype,
      name,
      (t) => get(nodeOf(t, name), t as ObjectValue),
      set && ((t, v) => set(nodeOf(t, name), v, t as ObjectValue)),
    )
  const orNull = (v: ObjectValue | null | undefined): EngineValue => v ?? E.Value.null
  const list = (items: ObjectValue[]) => E.CreateArrayFromList(items as never) as unknown as EngineValue
  nodeAttr('nodeType', (n) => num(NODE_TYPES[n.kind]))
  nodeAttr('nodeName', (n) =>
    str(n.kind === 'element' ? n.localName.toUpperCase() : n.kind === 'text' ? '#text' : n.kind === 'document' ? '#document' : n.localName),
  )
  nodeAttr('parentNode', (n) => orNull(n.parentNode))
  nodeAttr('parentElement', (n) => orNull(n.parentNode && isElement(n.parentNode) ? n.parentNode : null))
  nodeAttr('childNodes', (n) => list(n.childNodes))
  nodeAttr('firstChild', (n) => orNull(n.childNodes[0]))
  nodeAttr('lastChild', (n) => orNull(n.childNodes[n.childNodes.length - 1]))
  const sibling = (self: ObjectValue, n: NodeData, offset: number) => {
    if (!n.parentNode) return E.Value.null
    const siblings = nodeDataOf(n.parentNode)!.childNodes
    return orNull(siblings[siblings.indexOf(self) + offset])
  }
  nodeAttr('previousSibling', (n, self) => sibling(self, n, -1))
  nodeAttr('nextSibling', (n, self) => sibling(self, n, 1))
  nodeAttr('isConnected', (_n, self) => bool(isInclusiveAncestor(documentObject, self)))
  nodeAttr('ownerDocument', (n) => (n.kind === 'document' ? E.Value.null : documentObject))
  nodeAttr(
    'textContent',
    (n, self) => (n.kind === 'document' || n.kind === 'doctype' ? E.Value.null : str(textContentOf(self))),
    (n, v, self) => setTextContent(n, self, v === E.Value.null ? '' : toDOMString(v)),
  )
  nodeAttr(
    'nodeValue',
    (n) => (n.kind === 'text' ? str(n.data) : E.Value.null),
    (n, v) => {
      if (n.kind === 'text') n.data = v === E.Value.null ? '' : toDOMString(v)
    },
  )
  function setTextContent(n: NodeData, self: ObjectValue, text: string) {
    if (n.kind === 'text') {
      n.data = text
      return
    }
    if (n.kind !== 'element') return
    for (const child of n.childNodes.slice()) removeFromParent(child)
    if (text !== '') insertChild(self, create('text', '#text', text), null)
  }

  /** DOM pre-insert validity: no cycles, and only elements and documents hold children. */
  const ensureInsertable = (parent: ObjectValue, child: ObjectValue, operation: string) => {
    const kind = nodeDataOf(parent)!.kind
    if (kind === 'text' || kind === 'doctype') {
      deps.throwDOMException('HierarchyRequestError', failedToExecute(operation, 'Node', 'This node type does not support this method.'))
    }
    if (isInclusiveAncestor(child, parent)) {
      deps.throwDOMException('HierarchyRequestError', failedToExecute(operation, 'Node', 'The new child element contains the parent.'))
    }
  }
  const method = (target: ObjectValue, name: string, length: number, steps: (n: NodeData, args: EngineValue[], self: ObjectValue) => EngineValue | void, iface = 'Node') =>
    defineMethod(realm, target, name, length, (args, { thisValue }) => steps(nodeOf(thisValue, name, iface), args, thisValue as ObjectValue))
  const requireArgs = (operation: string, args: EngineValue[], count: number, iface = 'Node') => {
    if (args.length < count) typeError(failedToExecute(operation, iface, `${count} argument${count > 1 ? 's' : ''} required, but only ${args.length} present.`))
  }

  method(Node.prototype, 'appendChild', 1, (_n, args, self) => {
    requireArgs('appendChild', args, 1)
    const child = nodeArg(args[0], 'appendChild')
    ensureInsertable(self, child, 'appendChild')
    insertChild(self, child, null)
    return child
  })
  method(Node.prototype, 'insertBefore', 2, (n, args, self) => {
    requireArgs('insertBefore', args, 2)
    const child = nodeArg(args[0], 'insertBefore')
    const before = args[1] === E.Value.null ? null : nodeArg(args[1], 'insertBefore', 'Node', 2)
    if (before && !n.childNodes.includes(before)) {
      deps.throwDOMException('NotFoundError', failedToExecute('insertBefore', 'Node', 'The node before which the new node is to be inserted is not a child of this node.'))
    }
    ensureInsertable(self, child, 'insertBefore')
    insertChild(self, child, before === child ? sibling(child, nodeDataOf(child)!, 1) as ObjectValue | null : before)
    return child
  })
  method(Node.prototype, 'removeChild', 1, (n, args) => {
    requireArgs('removeChild', args, 1)
    const child = nodeArg(args[0], 'removeChild')
    if (!n.childNodes.includes(child)) {
      deps.throwDOMException('NotFoundError', failedToExecute('removeChild', 'Node', 'The node to be removed is not a child of this node.'))
    }
    removeFromParent(child)
    return child
  })
  method(Node.prototype, 'contains', 1, (_n, args, self) => {
    const other = args[0]
    return bool(!!other && other !== E.Value.null && !!nodeDataOf(other) && isInclusiveAncestor(self, other as ObjectValue))
  })
  method(Node.prototype, 'hasChildNodes', 0, (n) => bool(n.childNodes.length > 0))

  /** ParentNode / ChildNode mixins: strings become Text nodes. */
  const toNodes = (args: EngineValue[]) =>
    args.map((a) => (nodeDataOf(a) ? (a as ObjectValue) : create('text', '#text', toDOMString(a))))
  for (const target of [Element.prototype, Document.prototype]) {
    const iface = target === Element.prototype ? 'Element' : 'Document'
    method(target, 'append', 0, (_n, args, self) => {
      for (const child of toNodes(args)) {
        ensureInsertable(self, child, 'append')
        insertChild(self, child, null)
      }
    }, iface)
    method(target, 'prepend', 0, (n, args, self) => {
      const first = n.childNodes[0] ?? null
      for (const child of toNodes(args)) {
        ensureInsertable(self, child, 'prepend')
        insertChild(self, child, first)
      }
    }, iface)
    method(target, 'replaceChildren', 0, (n, args, self) => {
      const nodes = toNodes(args)
      for (const child of nodes) ensureInsertable(self, child, 'replaceChildren')
      for (const child of n.childNodes.slice()) removeFromParent(child)
      for (const child of nodes) insertChild(self, child, null)
    }, iface)
    defineAttribute(realm, target, 'children', (t) => list(nodeOf(t, 'children').childNodes.filter(isElement)))
    defineAttribute(realm, target, 'childElementCount', (t) => num(nodeOf(t, 'childElementCount').childNodes.filter(isElement).length))
    defineAttribute(realm, target, 'firstElementChild', (t) => orNull(nodeOf(t, 'firstElementChild').childNodes.find(isElement)))
    defineAttribute(realm, target, 'lastElementChild', (t) => orNull(nodeOf(t, 'lastElementChild').childNodes.filter(isElement).pop()))
    const selector = (operation: string, args: EngineValue[]): ParsedSelector => {
      requireArgs(operation, args, 1, iface)
      const text = toDOMString(args[0]!)
      const parsed = parseSelector(text)
      if (parsed === 'invalid') deps.throwDOMException('SyntaxError', failedToExecute(operation, iface, `'${text}' is not a valid selector.`))
      if (parsed === 'unsupported') deps.throwUnsupported(`${operation}('${text}')`)
      return parsed as ParsedSelector
    }
    method(target, 'querySelector', 1, (_n, args, self) => {
      const parsed = selector('querySelector', args)
      for (const element of descendantElements(self)) if (matches(element, parsed)) return element
      return E.Value.null
    }, iface)
    method(target, 'querySelectorAll', 1, (_n, args, self) => {
      const parsed = selector('querySelectorAll', args)
      return list([...descendantElements(self)].filter((element) => matches(element, parsed)))
    }, iface)
  }
  for (const target of [Element.prototype, CharacterData.prototype]) {
    method(target, 'remove', 0, (_n, _args, self) => removeFromParent(self))
  }

  installElementMembers({
    realm,
    global,
    deps,
    interfaces: { Element, HTMLElement, CharacterData },
    nodeOf,
    method,
    requireArgs,
    setTextContent,
  })

  // --- Document --------------------------------------------------------------------------
  // Node accessors above read it only when called, after this line has run.
  const documentObject = create('document', '#document')
  const doctype = create('doctype', 'html')
  const html = create('element', 'html')
  const head = create('element', 'head')
  const body = create('element', 'body')
  const script = create('element', 'script')
  insertChild(documentObject, doctype, null)
  insertChild(documentObject, html, null)
  insertChild(html, head, null)
  insertChild(html, body, null)
  insertChild(body, script, null)

  const documentOf = (t: EngineValue, operation: string) => {
    const n = nodeOf(t, operation, 'Document')
    if (n.kind !== 'document') typeError(failedToExecute(operation, 'Document', 'Illegal invocation'))
    return n
  }
  const docAttr = (name: string, get: () => EngineValue) =>
    defineAttribute(realm, Document.prototype, name, (t) => {
      documentOf(t, name)
      return get()
    })
  const childElement = (parent: ObjectValue, localName: string) =>
    orNull(nodeDataOf(parent)!.childNodes.find((c) => nodeDataOf(c)!.localName === localName && isElement(c)))
  docAttr('documentElement', () => childElement(documentObject, 'html'))
  docAttr('head', () => childElement(html, 'head'))
  docAttr('body', () => childElement(html, 'body'))
  // The Oracle's document finished loading synchronously right after the Script's Task.
  docAttr('readyState', () => str(deps.scriptRunning() ? 'loading' : 'complete'))
  docAttr('currentScript', () => (deps.scriptRunning() && nodeDataOf(script)!.parentNode ? script : E.Value.null))
  docAttr('title', () => str(''))
  docAttr('URL', () => str('about:blank'))
  docAttr('documentURI', () => str('about:blank'))
  docAttr('defaultView', () => global)
  docAttr('visibilityState', () => str('visible'))
  docAttr('hidden', () => E.Value.false)
  method(Document.prototype, 'createElement', 1, (_n, args) => {
    requireArgs('createElement', args, 1, 'Document')
    const name = toDOMString(args[0]!)
    if (!VALID_NAME.test(name)) {
      deps.throwDOMException('InvalidCharacterError', failedToExecute('createElement', 'Document', `The tag name provided ('${name}') is not a valid name.`))
    }
    return create('element', name.toLowerCase())
  }, 'Document')
  method(Document.prototype, 'createTextNode', 1, (_n, args) => {
    requireArgs('createTextNode', args, 1, 'Document')
    return create('text', '#text', toDOMString(args[0]!))
  }, 'Document')
  method(Document.prototype, 'getElementById', 1, (_n, args) => {
    requireArgs('getElementById', args, 1, 'Document')
    const id = toDOMString(args[0]!)
    for (const element of descendantElements(documentObject)) if (nodeDataOf(element)!.attributes.get('id') === id) return element
    return E.Value.null
  }, 'Document')
  targets.defineEventHandler(Document.prototype, 'click')

  defineAttribute(realm, global, 'document', () => documentObject)
  return documentObject
}
