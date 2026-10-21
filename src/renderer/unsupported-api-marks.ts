import { javascriptLanguage } from '@codemirror/lang-javascript'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'

export interface UnsupportedUsage {
  api: string
  from: number
  to: number
  /** 1-based. */
  line: number
}

/**
 * Where the Script references each Unsupported API. The pre-run scan only names the APIs, so the
 * editor re-finds them in the syntax tree: strings, comments and `.property` names never match,
 * the same references the scan itself skips.
 */
export function findUnsupportedUsages(text: string, apis: readonly string[]): UnsupportedUsage[] {
  if (apis.length === 0) return []
  const wanted = new Set(apis)
  const usages: UnsupportedUsage[] = []
  javascriptLanguage.parser.parse(text).iterate({
    enter: (node) => {
      if (node.name !== 'VariableName') return
      let api = text.slice(node.from, node.to)
      let to = node.to
      // `Atomics.wait` is only unsupported as a pair; plain `Atomics` is fine.
      if (api === 'Atomics' && text.startsWith('.wait', node.to)) {
        api = 'Atomics.wait'
        to = node.to + '.wait'.length
      }
      if (!wanted.has(api)) return
      const line = text.slice(0, node.from).split('\n').length
      usages.push({ api, from: node.from, to, line })
    },
  })
  return usages
}

export const setUnsupportedApis = StateEffect.define<readonly string[]>()

interface MarkState {
  apis: readonly string[]
  decorations: DecorationSet
}

function build(text: string, apis: readonly string[]): MarkState {
  const marks = findUnsupportedUsages(text, apis).map((u) =>
    Decoration.mark({ class: 'cm-unsupported-api' }).range(u.from, u.to),
  )
  return { apis, decorations: Decoration.set(marks, true) }
}

const marksField = StateField.define<MarkState>({
  create: () => ({ apis: [], decorations: Decoration.none }),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setUnsupportedApis)) return build(tr.state.doc.toString(), effect.value)
    }
    // Re-find after an edit so the marks follow the text before the new scan result arrives.
    return tr.docChanged && value.apis.length > 0 ? build(tr.state.doc.toString(), value.apis) : value
  },
  provide: (field) => EditorView.decorations.from(field, (v) => v.decorations),
})

/** Error-coloured wavy marks on the tokens of Unsupported APIs; drive it with `setUnsupportedApis`. */
export function unsupportedApiMarks(): Extension {
  return marksField
}
