import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { explainEvent, phrasesFor } from '../player/explain-event'
import type { ExplainLocale } from '../player/explain-event'
import type { TraceEvent } from '../trace/trace-event'

/** The one-sentence account of the current step, in the UI language; empty before any Trace. */
export function useStepSentence(events: () => readonly TraceEvent[], position: () => number) {
  const { locale } = useI18n()
  return computed(() => {
    const event = events()[position()]
    return event ? explainEvent(event, events(), phrasesFor(locale.value as ExplainLocale)).text : ''
  })
}
