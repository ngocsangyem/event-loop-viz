import { syntaxTree } from '@codemirror/language'
import type { Extension, Range } from '@codemirror/state'
import { Decoration, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'

type Concept = 'webapi' | 'job' | 'console'

const GLOBAL_CONCEPT: Record<string, Concept> = {
  setTimeout: 'webapi',
  setInterval: 'webapi',
  clearTimeout: 'webapi',
  clearInterval: 'webapi',
  MessageChannel: 'webapi',
  Promise: 'job',
  queueMicrotask: 'job',
  console: 'console',
}
const REACTION_METHODS = new Set(['then', 'catch', 'finally'])
const CONSOLE_METHODS = new Set(['log', 'info', 'warn', 'error'])

/** The concept a token belongs to, so the Script previews where each call lands. */
export function conceptOf(name: string, isProperty: boolean, textBefore: string): Concept | null {
  if (!isProperty) return GLOBAL_CONCEPT[name] ?? null
  if (REACTION_METHODS.has(name)) return 'job'
  if (CONSOLE_METHODS.has(name) && textBefore.endsWith('console.')) return 'console'
  return null
}

function build(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const { doc } = view.state
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const isProperty = node.name === 'PropertyName'
        if (!isProperty && node.name !== 'VariableName') return
        const name = doc.sliceString(node.from, node.to)
        const concept = conceptOf(name, isProperty, doc.sliceString(Math.max(0, node.from - 8), node.from))
        if (concept) ranges.push(Decoration.mark({ class: `cm-concept-${concept}` }).range(node.from, node.to))
      },
    })
  }
  return Decoration.set(ranges, true)
}

const plugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = build(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations },
)

export function conceptCallHighlight(): Extension {
  return plugin
}
