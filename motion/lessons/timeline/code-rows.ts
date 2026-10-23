import type { CodeRow } from '../lesson-types'

/** Longest row before a line wraps; the film then sizes the type so the longest row fits. */
export const CODE_ROW_CHARS = 62

/**
 * Lines a learner should not read in the video: the fixture's `// Concept:` header (it gives the
 * answer away) and oracle-only directives. `// @fetch` stays: it is what serves the mocked response.
 */
function hidden(line: string): boolean {
  const text = line.trim()
  return /^\/\/\s*Concept:/.test(text) || /^\/\/\s*@oracle-/.test(text) || text === ''
}

/** Last place before `room` to break a line: after a comma, an opening bracket or a space, never inside a string. */
function breakPoint(text: string, room: number): number {
  let quote: string | null = null
  let best = -1
  for (let i = 0; i < Math.min(room, text.length); i++) {
    const c = text[i]!
    if (quote) {
      if (c === quote && text[i - 1] !== '\\') quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') quote = c
    else if (c === ',' || c === '(' || c === '{') best = i + 1
    else if (c === ' ' && best < i - 12) best = i + 1
  }
  return best > room * 0.35 ? best : room
}

/** Splits one long line at a space, comma or bracket so each piece fits; continuation rows indent. */
function wrap(text: string, width: number): string[] {
  if (text.length <= width) return [text]
  const indent = (/^\s*/.exec(text)?.[0] ?? '') + '    '
  const rows: string[] = []
  let rest = text
  let room = width
  while (rest.length > room) {
    const at = breakPoint(rest, room)
    rows.push(rest.slice(0, at).trimEnd())
    rest = indent + rest.slice(at).trimStart()
    room = width
  }
  rows.push(rest)
  return rows
}

/** The Script as display rows, numbered from 1 over the lines that stay, plus Trace line → display line. */
export function codeRowsOf(source: string, width = CODE_ROW_CHARS): { rows: CodeRow[]; displayLine: Map<number, number> } {
  const rows: CodeRow[] = []
  const displayLine = new Map<number, number>()
  let shown = 0
  source.split('\n').forEach((line, i) => {
    const sourceLine = i + 1
    if (hidden(line)) return
    shown++
    displayLine.set(sourceLine, shown)
    wrap(line.replace(/\t/g, '  '), width).forEach((text, j) => rows.push({ number: j === 0 ? shown : null, sourceLine, text }))
  })
  return { rows, displayLine }
}
