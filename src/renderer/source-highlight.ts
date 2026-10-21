import { RangeSet, StateEffect, StateField } from '@codemirror/state'
import type { EditorState, Extension, Range, Text } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, gutterLineClass } from '@codemirror/view'
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

const CURRENT_LINE_CLASS = 'cm-source-line'

function decorationsFor(doc: Text, highlight: SourceHighlight): DecorationSet {
  const docLength = doc.length
  const ranges: Range<Decoration>[] = []
  // The row the playhead is on, not every row its range spans: a multi-line callback would
  // otherwise paint the whole block as "now".
  if (highlight.source && highlight.source.start < docLength) {
    const line = doc.lineAt(Math.max(highlight.source.start, 0))
    ranges.push(Decoration.line({ class: CURRENT_LINE_CLASS }).range(line.from))
  }
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
      if (effect.is(setSourceHighlight)) return decorationsFor(tr.state.doc, effect.value)
    }
    return tr.docChanged ? value.map(tr.changes) : value
  },
  provide: (field) => EditorView.decorations.from(field),
})

/** Marks the gutter cells of the current row so the line number can turn accent. */
class CurrentLineGutterMarker extends GutterMarker {
  elementClass = 'cm-source-line-gutter'
}
const currentLineMarker = new CurrentLineGutterMarker()

const currentLineGutterField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setSourceHighlight)) continue
      const { doc } = tr.state
      const source = effect.value.source
      if (!source || source.start >= doc.length) return RangeSet.empty
      const line = doc.lineAt(Math.max(source.start, 0))
      return RangeSet.of([currentLineMarker.range(line.from)])
    }
    return tr.docChanged ? value.map(tr.changes) : value
  },
  provide: (field) => gutterLineClass.from(field),
})

export function sourceHighlight(): Extension {
  return [highlightField, currentLineGutterField]
}

/** The highlighted ranges currently in the editor state. */
export function highlightedRanges(state: EditorState) {
  const out: { from: number; to: number; kind: HighlightKind }[] = []
  state.field(highlightField).between(0, state.doc.length, (from, to, deco) => {
    if (deco.spec.class === CURRENT_LINE_CLASS) return
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

/** 1-based number of the row carrying the current-line rule, or null when nothing is highlighted. */
export function currentHighlightLine(state: EditorState): number | null {
  let found: number | null = null
  state.field(highlightField).between(0, state.doc.length, (from, _to, deco) => {
    if (deco.spec.class === CURRENT_LINE_CLASS) found = state.doc.lineAt(from).number
  })
  return found
}
