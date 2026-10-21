import type { TraceEvent } from '../trace/trace-event'

/** Languages the explanations are written in; mirrors the app's locales without importing them. */
export type ExplainLocale = 'en' | 'vi'

/**
 * Names things by where the Script created them, falling back to their id. `Start` forms open a
 * sentence, the others sit inside one; languages that do not change case return the same text.
 */
export interface Namer {
  promise(pid: string): string
  promiseInline(pid: string): string
  timer(tid: string): string
  timerStart(tid: string): string
}

/** One sentence for one event kind. A kind shared by several `k` values receives its own event. */
export type EventPhrase<K extends TraceEvent['k']> = (e: TraceEvent & { k: K }, name: Namer) => string

/**
 * Everything the explanation says, in one language. Sentence building lives here (not in the UI
 * layer) because the player is framework-free, so it cannot call an i18n library.
 */
export interface ExplainPhrases {
  /** `line` is where the Script created the promise, when known. */
  promiseRef(pid: string, line: number | undefined, atStart: boolean): string
  timerRef(tid: string, line: number | undefined, atStart: boolean): string
  describe: { [K in TraceEvent['k']]: EventPhrase<K> }
}
