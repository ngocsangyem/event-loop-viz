import { Decoration, EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import type { EditorState } from '@codemirror/state'

export interface SyntaxErrorPosition {
  /** 1-based, as reported by the engine. */
  line: number
  column: number
}

/** Underlines the failing character and tints its line; clamped so a stale position never throws. */
export function syntaxErrorMarker(state: EditorState, at: SyntaxErrorPosition | null): Extension {
  if (!at) return []
  const line = state.doc.line(Math.min(Math.max(at.line, 1), state.doc.lines))
  const from = Math.min(line.from + Math.max(at.column - 1, 0), line.to)
  const ranges = [Decoration.line({ class: 'cm-syntax-error-line' }).range(line.from)]
  if (from < line.to) {
    ranges.push(Decoration.mark({ class: 'cm-syntax-error-mark' }).range(from, from + 1))
  }
  return EditorView.decorations.of(Decoration.set(ranges))
}
