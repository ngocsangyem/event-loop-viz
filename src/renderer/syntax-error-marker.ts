import { RangeSet } from '@codemirror/state'
import type { EditorState, Extension } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, WidgetType, lineNumberMarkers } from '@codemirror/view'

export interface SyntaxErrorPosition {
  /** 1-based, as reported by the engine. */
  line: number
  column: number
}

/** Replaces the line number of the failing line with ↯. */
class ErrorNumberMarker extends GutterMarker {
  elementClass = 'cm-syntax-error-number'
  toDOM() {
    return document.createTextNode('↯')
  }
}

/** The lint row under the failing line: `↯ SYNTAXERROR <message>`. */
class LintRowWidget extends WidgetType {
  constructor(private readonly message: string) {
    super()
  }
  eq(other: LintRowWidget) {
    return other.message === this.message
  }
  toDOM() {
    const row = document.createElement('div')
    row.className = 'cm-syntax-error-row'
    row.setAttribute('aria-hidden', 'true')
    row.textContent = `↯ SyntaxError ${this.message}`
    return row
  }
}

/**
 * Marks the failing line: ↯ in the gutter, a tinted line, a wavy underline on the failing
 * character and, when the engine's message is known, a lint row beneath. Clamped so a stale
 * position never throws.
 */
export function syntaxErrorMarker(
  state: EditorState,
  at: SyntaxErrorPosition | null,
  message?: string,
): Extension {
  if (!at) return []
  const line = state.doc.line(Math.min(Math.max(at.line, 1), state.doc.lines))
  const from = Math.min(line.from + Math.max(at.column - 1, 0), line.to)
  const ranges = [Decoration.line({ class: 'cm-syntax-error-line' }).range(line.from)]
  if (from < line.to) {
    ranges.push(Decoration.mark({ class: 'cm-syntax-error-mark' }).range(from, from + 1))
  }
  const extensions: Extension[] = [
    EditorView.decorations.of(Decoration.set(ranges)),
    lineNumberMarkers.of(RangeSet.of([new ErrorNumberMarker().range(line.from)])),
  ]
  if (message) {
    const row = Decoration.widget({ widget: new LintRowWidget(message), block: true, side: 1 })
    extensions.push(EditorView.decorations.of(Decoration.set([row.range(line.to)])))
  }
  return extensions
}
