// The node tree behind `document`: nodes, tree mutation, simple selectors and HTML serialization.
import type { EngineValue } from './engine262-types'
import type { EventData } from './event-objects'
import { EventTargetData } from './event-target'
import { hostDataOf } from './web-idl-helpers'
import type { ObjectValue } from './web-idl-helpers'

export type NodeKind = 'document' | 'doctype' | 'element' | 'text'

/** Host data of a Node object. */
export class NodeData extends EventTargetData {
  parentNode: ObjectValue | null = null
  childNodes: ObjectValue[] = []
  attributes = new Map<string, string>()
  /** Set while click() dispatches, so a nested click() on the same element does nothing. */
  clickInProgress = false
  constructor(
    readonly kind: NodeKind,
    /** Lower-case tag name of an element; `#text`, `#document`, `html` (doctype) otherwise. */
    readonly localName: string,
    public data = '',
    /** The window, the parent of the document on an event path (not for `load`). */
    readonly window: () => ObjectValue | null = () => null,
  ) {
    super()
  }
  override parent(event: EventData): ObjectValue | null {
    if (this.parentNode) return this.parentNode
    return this.kind === 'document' && event.type !== 'load' ? this.window() : null
  }
  override mark(m: (value: unknown) => void) {
    super.mark(m)
    m(this.parentNode)
    this.childNodes.forEach(m)
  }
}

const isNodeData = (d: unknown): d is NodeData => d instanceof NodeData
export const nodeDataOf = (value: EngineValue) => hostDataOf(value, isNodeData)
const node = (object: ObjectValue) => nodeDataOf(object)!

export const isElement = (object: ObjectValue) => node(object).kind === 'element'

/** True when `ancestor` is `descendant` or one of its ancestors. */
export function isInclusiveAncestor(ancestor: ObjectValue, descendant: ObjectValue): boolean {
  for (let n: ObjectValue | null = descendant; n; n = node(n).parentNode) if (n === ancestor) return true
  return false
}

export function removeFromParent(child: ObjectValue) {
  const data = node(child)
  if (!data.parentNode) return
  const parent = node(data.parentNode)
  parent.childNodes = parent.childNodes.filter((c) => c !== child)
  data.parentNode = null
}

/** Inserts `child` into `parent` before `before` (null = at the end), moving it from its old parent. */
export function insertChild(parent: ObjectValue, child: ObjectValue, before: ObjectValue | null) {
  removeFromParent(child)
  const data = node(parent)
  const at = before ? data.childNodes.indexOf(before) : -1
  if (at === -1) data.childNodes.push(child)
  else data.childNodes.splice(at, 0, child)
  node(child).parentNode = parent
}

export function textContentOf(object: ObjectValue): string {
  const data = node(object)
  if (data.kind === 'text') return data.data
  return data.childNodes.map(textContentOf).join('')
}

/** Elements under `root` in tree order (root excluded). */
export function* descendantElements(root: ObjectValue): Generator<ObjectValue> {
  for (const child of node(root).childNodes) {
    if (isElement(child)) yield child
    yield* descendantElements(child)
  }
}

export function root(object: ObjectValue): ObjectValue {
  let n = object
  while (node(n).parentNode) n = node(n).parentNode!
  return n
}

// --- Selectors -----------------------------------------------------------------------------

interface Compound {
  tag?: string
  id?: string
  classes: string[]
}

/** A selector list this simulator understands: compounds of `tag`, `#id`, `.class`, joined by spaces. */
export type ParsedSelector = Compound[][]

const IDENT = '-?[_a-zA-Z][-_a-zA-Z0-9]*'
const COMPOUND = new RegExp(`^(\\*|${IDENT})?((?:[#.]${IDENT})*)$`)

/** Parses a selector list; 'unsupported' for valid CSS this simulator does not model (>, :hover, [x]). */
export function parseSelector(text: string): ParsedSelector | 'invalid' | 'unsupported' {
  const groups = text.split(',').map((g) => g.trim())
  if (groups.some((g) => g === '')) return 'invalid'
  const parsed: ParsedSelector = []
  for (const group of groups) {
    const compounds: Compound[] = []
    for (const part of group.split(/\s+/)) {
      if (/[>+~:[\]()"'=|^$]/.test(part)) return 'unsupported'
      const match = COMPOUND.exec(part)
      if (!match || (!match[1] && !match[2])) return 'invalid'
      const compound: Compound = { classes: [] }
      if (match[1] && match[1] !== '*') compound.tag = match[1].toLowerCase()
      for (const piece of match[2]!.match(new RegExp(`[#.]${IDENT}`, 'g')) ?? []) {
        if (piece.startsWith('#')) compound.id = piece.slice(1)
        else compound.classes.push(piece.slice(1))
      }
      compounds.push(compound)
    }
    parsed.push(compounds)
  }
  return parsed
}

const matchesCompound = (element: ObjectValue, c: Compound) => {
  const data = node(element)
  if (c.tag && data.localName !== c.tag) return false
  if (c.id !== undefined && data.attributes.get('id') !== c.id) return false
  const classes = (data.attributes.get('class') ?? '').split(/\s+/).filter(Boolean)
  return c.classes.every((name) => classes.includes(name))
}

/** Right-to-left match of `a b c`: the element matches c, an ancestor b, a further ancestor a. */
function matchesGroup(element: ObjectValue, group: Compound[]): boolean {
  if (!matchesCompound(element, group[group.length - 1]!)) return false
  let i = group.length - 2
  for (let n = node(element).parentNode; n && i >= 0; n = node(n).parentNode) {
    if (isElement(n) && matchesCompound(n, group[i]!)) i--
  }
  return i < 0
}

export const matches = (element: ObjectValue, selector: ParsedSelector) => selector.some((g) => matchesGroup(element, g))

// --- Serialization -------------------------------------------------------------------------

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttribute = (s: string) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/"/g, '&quot;')

/** HTML fragment serialization of `object`'s children (innerHTML). */
export function serializeChildren(object: ObjectValue): string {
  return node(object).childNodes.map(serializeNode).join('')
}

export function serializeNode(object: ObjectValue): string {
  const data = node(object)
  if (data.kind === 'text') return data.parentNode && node(data.parentNode).localName === 'script' ? data.data : escapeText(data.data)
  if (data.kind !== 'element') return ''
  const attributes = [...data.attributes].map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join('')
  if (VOID_ELEMENTS.has(data.localName)) return `<${data.localName}${attributes}>`
  return `<${data.localName}${attributes}>${serializeChildren(object)}</${data.localName}>`
}
