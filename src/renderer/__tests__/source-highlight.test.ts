import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { sourceHighlight, setSourceHighlight, highlightedRanges, currentHighlightLine } from '../source-highlight'
import type { SourceLocation } from '../../trace/trace-event'

const loc = (start: number, end: number): SourceLocation => ({ start, end, line: 1, column: start })

function stateWith(doc: string) {
  return EditorState.create({ doc, extensions: [sourceHighlight()] })
}

describe('source highlight', () => {
  it('has no highlight until one is set', () => {
    expect(highlightedRanges(stateWith('abcdef'))).toEqual([])
  })

  it('marks the current range as source and the cause range as cause', () => {
    const next = stateWith('abcdefghij').update({
      effects: setSourceHighlight.of({ source: loc(2, 5), cause: loc(6, 9) }),
    }).state
    expect(highlightedRanges(next)).toEqual([
      { from: 2, to: 5, kind: 'source' },
      { from: 6, to: 9, kind: 'cause' },
    ])
  })

  it('clears when the event has no location', () => {
    const set = stateWith('abcdef').update({
      effects: setSourceHighlight.of({ source: loc(0, 3), cause: null }),
    }).state
    const cleared = set.update({
      effects: setSourceHighlight.of({ source: null, cause: null }),
    }).state
    expect(highlightedRanges(cleared)).toEqual([])
  })

  it('clamps ranges past the document end and skips empty ones', () => {
    const next = stateWith('abc').update({
      effects: setSourceHighlight.of({ source: loc(1, 99), cause: loc(2, 2) }),
    }).state
    expect(highlightedRanges(next)).toEqual([{ from: 1, to: 3, kind: 'source' }])
  })

  it('keeps ranges aligned when the document is edited', () => {
    const set = stateWith('abcdef').update({
      effects: setSourceHighlight.of({ source: loc(2, 4), cause: null }),
    }).state
    const edited = set.update({ changes: { from: 0, insert: 'XX' } }).state
    expect(highlightedRanges(edited)).toEqual([{ from: 4, to: 6, kind: 'source' }])
  })

  it('puts the current-line rule on the row the range starts on, not every row it spans', () => {
    const state = stateWith('one\ntwo\nthree').update({
      effects: setSourceHighlight.of({ source: loc(5, 12), cause: null }),
    }).state
    expect(currentHighlightLine(state)).toBe(2)
  })

  it('has no current line when nothing is highlighted or the range is stale', () => {
    expect(currentHighlightLine(stateWith('abc'))).toBeNull()
    const stale = stateWith('abc').update({
      effects: setSourceHighlight.of({ source: loc(50, 60), cause: null }),
    }).state
    expect(currentHighlightLine(stale)).toBeNull()
  })
})
