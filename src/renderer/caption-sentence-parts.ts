/** A run of caption text; `hue` is set for a Task / Job / Timer id so it can be tinted. */
export interface SentencePart {
  text: string
  hue?: 'task' | 'job' | 'webapi'
}

const CONCEPT_ID = /\b(Task|Job|Timer) #\d+/g
const HUE_OF: Record<string, SentencePart['hue']> = { Task: 'task', Job: 'job', Timer: 'webapi' }

/**
 * Splits a caption sentence so `Task #2`, `Job #3` and `Timer #1` can be set in mono in their
 * concept hue (the same names the panes use). Everything else stays plain text.
 */
export function splitConceptIds(sentence: string): SentencePart[] {
  const parts: SentencePart[] = []
  let from = 0
  for (const match of sentence.matchAll(CONCEPT_ID)) {
    if (match.index > from) parts.push({ text: sentence.slice(from, match.index) })
    parts.push({ text: match[0], hue: HUE_OF[match[1]!] })
    from = match.index + match[0].length
  }
  if (from < sentence.length) parts.push({ text: sentence.slice(from) })
  return parts
}
