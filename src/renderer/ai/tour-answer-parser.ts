/** One stop of a tour: the Trace event it moves the replay to, and what the AI says about it. */
export interface TourStop {
  seq: number
  title: string
  /** Markdown-lite text under the stop's heading. */
  body: string
}

/** An answer split into the text before the stops, the stops, and the text after them. */
export interface TourAnswer {
  intro: string
  stops: TourStop[]
  outro: string
}

/** An optional "Step" / "Event" word before the number, in the UI languages. */
const LABEL = '(?:(?:step|event|bước|sự kiện)\\s*)?'
/**
 * Stop lines. The prompt asks for "## #12 Title", but models drift, so these also count:
 * "### Step #12: Title", "## **#12** Title", "**#12 — Title**" and "1. **#12** Title". Outside a
 * heading the number must be bold, so a plain sentence starting with "#3" stays text.
 */
const STOP_LINES = [
  new RegExp(`^\\s{0,3}#{1,4}\\s+(?:\\*\\*)?${LABEL}#(\\d+)(.*)$`, 'iu'),
  new RegExp(`^\\s{0,3}(?:\\d{1,2}[.)]\\s+|[-*+]\\s+)?\\*\\*${LABEL}#(\\d+)(.*)$`, 'iu'),
]
const OTHER_HEADING = /^\s{0,3}#{1,4}\s+(.*?)\s*$/

const strong = (text: string) => text.replace(/^\*\*(.*)\*\*$/, '$1').trim()

const SUMMARY = /^(summary|tóm tắt|tóm lại|kết luận)[:.]?$/iu
/** "(#20, #21)" or "(#7)": event numbers the learner never sees in the UI. */
const EVENT_REF_GROUP = /\s*\((?:\s*#\d+\s*(?:,|and|và)?)+\)/gu

/** Drops parenthesized event numbers from prose; code spans are left alone. */
function withoutEventRefs(text: string): string {
  return text
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(EVENT_REF_GROUP, '')))
    .join('')
}

/** The title after the number, without bold marks or the separator ("—", ":", "."). */
const titleOf = (rest: string) => rest.replace(/\*\*/g, '').replace(/^\s*[:.)\-–—]?\s*/u, '').trim()

function matchStop(line: string): { seq: number; title: string } | null {
  for (const pattern of STOP_LINES) {
    const found = pattern.exec(line)
    if (found) return { seq: Number(found[1]), title: titleOf(found[2] ?? '') }
  }
  return null
}

/**
 * Splits model output into a tour. A stop heading names a Trace event; `resolve` turns the number
 * into the position the replay can show, or null to keep the heading as plain text. Headings that
 * are not stops become bold lines, so the markdown renderer never shows stray "#" marks. A stop
 * that lands on the same position as the one before it joins that stop, so Next always moves.
 * While an answer streams (`complete` false), a heading still being written is held back: "## #1"
 * may yet become "## #12".
 */
export function parseTourAnswer(
  text: string,
  resolve: (seq: number) => number | null,
  complete = true,
): TourAnswer {
  const intro: string[] = []
  const outro: string[] = []
  const stops: { seq: number; title: string; lines: string[] }[] = []
  let target = intro

  const lines = text.split('\n')
  // While streaming, the last line may be a stop heading still being written.
  const last = lines[lines.length - 1] ?? ''
  if (!complete && (/^\s{0,3}#/.test(last) || /\*\*[^*]*#\d*$/.test(last))) lines.pop()

  for (const line of lines) {
    const stop = matchStop(line)
    const seq = stop ? resolve(stop.seq) : null
    const previous = stops[stops.length - 1]
    if (stop && seq !== null && previous?.seq === seq && target === previous.lines) {
      if (stop.title !== '') previous.lines.push(`**${stop.title}**`)
      continue
    }
    if (stop && seq !== null) {
      const entry = { seq, title: stop.title, lines: [] as string[] }
      stops.push(entry)
      target = entry.lines
      continue
    }
    const heading = OTHER_HEADING.exec(line)
    if (heading) {
      // A heading after the stops ("## Summary") closes the tour; the summary label itself is noise.
      if (stops.length > 0) target = outro
      const label = strong(heading[1] ?? '')
      if (label !== '' && !(target === outro && SUMMARY.test(label))) target.push(`**${label}**`)
      continue
    }
    target.push(line)
  }

  const prose = (part: string[]) => withoutEventRefs(part.join('\n')).trim()
  return {
    intro: prose(intro),
    stops: stops.map(({ seq, title, lines }) => ({ seq, title: withoutEventRefs(title), body: prose(lines) })),
    outro: prose(outro),
  }
}
