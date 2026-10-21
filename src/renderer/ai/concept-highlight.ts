/** Splits prose so concept ids (Task #3, Job #2, Timer #1, Checkpoint, Tick) can be set in their hue. */
export interface ConceptSegment {
  text: string
  /** Tailwind text colour class for a concept id; absent for plain prose. */
  hue?: string
}

const CONCEPT = /\b((?:Task|Job|Timer|Microtask) #\d+|Checkpoint|Tick(?: #?\d+)?)\b/g

function hueFor(id: string): string {
  if (id.startsWith('Task')) return 'text-task'
  if (id.startsWith('Timer')) return 'text-webapi'
  // Jobs and the Microtask Checkpoint share the microtask hue; a Tick is the loop's own beat.
  if (id.startsWith('Tick')) return 'text-brand-text'
  return 'text-job'
}

export function highlightConcepts(text: string): ConceptSegment[] {
  const out: ConceptSegment[] = []
  let last = 0
  for (const match of text.matchAll(CONCEPT)) {
    if (match.index > last) out.push({ text: text.slice(last, match.index) })
    out.push({ text: match[0], hue: hueFor(match[0]) })
    last = match.index + match[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
