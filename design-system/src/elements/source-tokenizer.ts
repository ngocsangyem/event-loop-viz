/**
 * Hand-written, single-line tokenizer for the Source pane (DESIGN.md · Signature moves ·
 * concept-aware highlighting). No CodeMirror: it only needs to colour the Script's few constructs.
 *
 * `tokenizeLine` splits one line into typed tokens; `segmentLine` further cuts those tokens at
 * diagnostic column boundaries so a flagged range can be underlined without nesting markup.
 * Offsets are 0-based UTF-16 columns; a range is `[from, to)`.
 */

export type TokenKind = 'keyword' | 'string' | 'number' | 'ident' | 'punct' | 'webapi' | 'job' | 'console' | 'plain'

export interface Token {
  text: string
  kind: TokenKind
}

export interface Segment extends Token {
  /** True when the segment lies inside a diagnostic range. */
  flagged: boolean
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'new', 'class',
  'throw', 'try', 'catch', 'finally', 'typeof', 'break', 'continue', 'switch', 'case', 'true', 'false', 'null', 'undefined',
])
const WEBAPI = new Set(['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'])
const JOB = new Set(['Promise', 'then', 'finally', 'queueMicrotask', 'await', 'async'])

/** Whitespace | line comment | string (an unterminated one runs to end of line) | number | dotted name | any char. */
const TOKEN_RE =
  /\s+|\/\/.*|'(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?|`(?:[^`\\]|\\.)*`?|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|[\s\S]/g

function classifyWord(word: string): TokenKind {
  if (WEBAPI.has(word)) return 'webapi'
  // `catch` is both a Promise method and a keyword; after a dot it is the Promise method (handled by caller).
  if (JOB.has(word)) return 'job'
  if (KEYWORDS.has(word)) return 'keyword'
  return 'ident'
}

export function tokenizeLine(line: string): Token[] {
  const out: Token[] = []
  for (const m of line.matchAll(TOKEN_RE)) {
    const t = m[0]
    if (/^\s+$/.test(t)) out.push({ text: t, kind: 'plain' })
    else if (t.startsWith('//')) out.push({ text: t, kind: 'punct' })
    else if (/^['"`]/.test(t)) out.push({ text: t, kind: 'string' })
    else if (/^\d/.test(t)) out.push({ text: t, kind: 'number' })
    else if (/^[A-Za-z_$]/.test(t)) {
      if (t === 'console' || t.startsWith('console.')) {
        out.push({ text: t, kind: 'console' })
        continue
      }
      t.split('.').forEach((part, i) => {
        if (i > 0) out.push({ text: '.', kind: 'punct' })
        // A name after a dot is a method: `.catch` is the Promise method, not the keyword.
        out.push({ text: part, kind: i > 0 && part === 'catch' ? 'job' : classifyWord(part) })
      })
    } else out.push({ text: t, kind: 'punct' })
  }
  return out
}

/** Tokens cut at the given `[from, to)` ranges, each segment marked flagged or not. */
export function segmentLine(line: string, ranges: ReadonlyArray<{ from: number; to: number }>): Segment[] {
  const out: Segment[] = []
  let pos = 0
  for (const tok of tokenizeLine(line)) {
    const end = pos + tok.text.length
    const cuts = new Set([pos, end])
    for (const r of ranges) for (const c of [r.from, r.to]) if (c > pos && c < end) cuts.add(c)
    const points = [...cuts].sort((a, b) => a - b)
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]
      const b = points[i + 1]
      out.push({ text: line.slice(a, b), kind: tok.kind, flagged: ranges.some((r) => a >= r.from && b <= r.to) })
    }
    pos = end
  }
  return out
}
