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

/** "## #12 Title", also "### #12: Title", "## **#12** Title" and "## #12. Title". */
const STOP_HEADING = /^\s{0,3}#{1,4}\s+(?:\*\*)?#(\d+)(?:\*\*)?\s*[:.)\-–—]?\s*(.*?)\s*$/
const OTHER_HEADING = /^\s{0,3}#{1,4}\s+(.*?)\s*$/

const strong = (text: string) => text.replace(/^\*\*(.*)\*\*$/, '$1').trim()

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
  if (!complete && /^\s{0,3}#/.test(lines[lines.length - 1] ?? '')) lines.pop()

  for (const line of lines) {
    const stop = STOP_HEADING.exec(line)
    const seq = stop ? resolve(Number(stop[1])) : null
    const previous = stops[stops.length - 1]
    if (stop && seq !== null && previous?.seq === seq && target === previous.lines) {
      const title = strong(stop[2] ?? '')
      if (title !== '') previous.lines.push(`**${title}**`)
      continue
    }
    if (stop && seq !== null) {
      const entry = { seq, title: strong(stop[2] ?? ''), lines: [] as string[] }
      stops.push(entry)
      target = entry.lines
      continue
    }
    const heading = OTHER_HEADING.exec(line)
    if (heading) {
      // A heading after the stops ("## Summary") closes the tour.
      if (stops.length > 0) target = outro
      const label = strong(heading[1] ?? '')
      if (label !== '') target.push(`**${label}**`)
      continue
    }
    target.push(line)
  }

  return {
    intro: intro.join('\n').trim(),
    stops: stops.map(({ seq, title, lines }) => ({ seq, title, body: lines.join('\n').trim() })),
    outro: outro.join('\n').trim(),
  }
}
