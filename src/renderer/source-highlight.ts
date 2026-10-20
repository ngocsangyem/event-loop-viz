import { StateEffect, StateField } from '@codemirror/state'
import type { EditorState, Extension, Range } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import type { SourceLocation } from '../trace/trace-event'

export interface SourceHighlight {
  /** Range being evaluated at the current position. */
  source: SourceLocation | null
  /** Range that scheduled the current Job or Task. */
  cause: SourceLocation | null
}

export type HighlightKind = 'source' | 'cause'

const CLASS_OF: Record<HighlightKind, string> = {
  source: 'cm-source-highlight',
  cause: 'cm-cause-highlight',
}

export const setSourceHighlight = StateEffect.define<SourceHighlight>()

function decorationsFor(docLength: number, highlight: SourceHighlight): DecorationSet {
  const ranges: Range<Decoration>[] = []
  for (const [kind, loc] of [
    ['cause', highlight.cause],
    ['source', highlight.source],
  ] as const) {
    if (!loc) continue
    // Clamped: a stale range must never throw while the document is shorter.
    const from = Math.min(Math.max(loc.start, 0), docLength)
    const to = Math.min(Math.max(loc.end, 0), docLength)
    if (from < to) ranges.push(Decoration.mark({ class: CLASS_OF[kind] }).range(from, to))
  }
  return Decoration.set(ranges, true)
}

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSourceHighlight)) return decorationsFor(tr.state.doc.length, effect.value)
    }
    return tr.docChanged ? value.map(tr.changes) : value
  },
  provide: (field) => EditorView.decorations.from(field),
})

export function sourceHighlight(): Extension {
  return highlightField
}

/** The highlighted ranges currently in the editor state. */
export function highlightedRanges(state: EditorState) {
  const out: { from: number; to: number; kind: HighlightKind }[] = []
  state.field(highlightField).between(0, state.doc.length, (from, to, deco) => {
    const kind = deco.spec.class === CLASS_OF.source ? 'source' : 'cause'
    out.push({ from, to, kind })
  })
  return out
}

/** Dispatches a highlight and scrolls the primary range into view when it is off-screen. */
export function applySourceHighlight(view: EditorView, highlight: SourceHighlight) {
  const effects: StateEffect<unknown>[] = [setSourceHighlight.of(highlight)]
  const docLength = view.state.doc.length
  if (highlight.source && highlight.source.start < docLength) {
    effects.push(EditorView.scrollIntoView(highlight.source.start, { y: 'nearest' }))
  }
  view.dispatch({ effects })
}
