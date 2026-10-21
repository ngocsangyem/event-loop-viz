import type { TraceEvent } from '../trace/trace-event'
import { EN_PHRASES } from './explain-phrases-en'
import { VI_PHRASES } from './explain-phrases-vi'
import type { ExplainLocale, ExplainPhrases, Namer } from './explain-phrases-types'

export type { ExplainLocale, ExplainPhrases } from './explain-phrases-types'
export { EN_PHRASES }

/** What the detail pane shows about one event; derived purely from the Trace. */
export interface EventExplanation {
  /** Plain-language account of what happened and why. */
  text: string
  /** Spec step the event implements, with a URL into the ES or HTML spec. */
  spec: { label: string; url: string }
}

/** `ES:#sec-x` / `HTML:event-loop` -> a labelled link into the matching spec. */
export function specLink(ref: TraceEvent['ref']): EventExplanation['spec'] {
  const colon = ref.indexOf(':')
  const spec = ref.slice(0, colon)
  const anchor = ref.slice(colon + 1).replace(/^#/, '')
  const base = spec === 'ES' ? 'https://tc39.es/ecma262/' : 'https://html.spec.whatwg.org/'
  return { label: `${spec} ${anchor}`, url: `${base}#${anchor}` }
}

/** The phrasebook for a locale; the renderer calls this so the player never sees i18n. */
export function phrasesFor(locale: ExplainLocale): ExplainPhrases {
  return locale === 'vi' ? VI_PHRASES : EN_PHRASES
}

function makeNamer(events: readonly TraceEvent[], at: number, phrases: ExplainPhrases): Namer {
  const lineWhere = (test: (e: TraceEvent) => boolean): number | undefined => {
    for (let i = Math.min(at, events.length - 1); i >= 0; i--) {
      const e = events[i]!
      if (e.loc && test(e)) return e.loc.line
    }
    return undefined
  }
  const promiseLine = (pid: string) =>
    lineWhere(
      (e) =>
        e.k !== 'promise:reaction' && e.k !== 'rejection:track' && 'pid' in e && e.pid === pid,
    )
  const timerLine = (tid: string) => lineWhere((e) => e.k === 'timer:init' && e.tid === tid)
  return {
    promise: (pid) => phrases.promiseRef(pid, promiseLine(pid), true),
    promiseInline: (pid) => phrases.promiseRef(pid, promiseLine(pid), false),
    timer: (tid) => phrases.timerRef(tid, timerLine(tid), false),
    timerStart: (tid) => phrases.timerRef(tid, timerLine(tid), true),
  }
}

/**
 * Plain-language explanation of an event from its kind and payload. `events` is the whole
 * Trace, used to name promises and timers by the line that created them. `phrases` picks the
 * language; English by default.
 */
export function explainEvent(
  event: TraceEvent,
  events: readonly TraceEvent[],
  phrases: ExplainPhrases = EN_PHRASES,
): EventExplanation {
  // The table is keyed by kind, so the entry for `event.k` always takes this event's variant.
  const phrase = phrases.describe[event.k] as (e: TraceEvent, name: Namer) => string
  return {
    text: phrase(event, makeNamer(events, event.seq, phrases)),
    spec: specLink(event.ref),
  }
}
