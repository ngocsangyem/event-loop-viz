import { computed, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { parseTourAnswer } from './tour-answer-parser'
import type { TourAnswer, TourStop } from './tour-answer-parser'
import type { ConversationMessage } from './use-ask-ai'

/** Turns an event number from the AI into a position the replay can show, or null if it cannot. */
export type StopResolver = (seq: number) => number | null

export interface AiTourOptions {
  messages: Ref<readonly ConversationMessage[]>
  /** True while the last answer is still arriving. */
  streaming: Ref<boolean>
  /** One resolver per Trace, null before any Run. A new resolver means a new Run. */
  resolver: Ref<StopResolver | null>
  /** The replay's playhead, so a started tour follows when the learner lands on a stop by other means. */
  position: Ref<number>
  /** Moves the replay to a stop. The caller pauses playback first: the tour wins over a running replay. */
  seek: (seq: number) => void
  /** Called when the tour itself moves to a stop (not when it follows the playhead). */
  onStop?: (stop: TourStop, index: number, total: number) => void
}

const NO_STOPS: StopResolver = () => null

/**
 * The guided tour over the AI's answers. Each answer parses into stops; the tour walks the stops
 * of one answer (the latest, until the learner picks a stop in an older one) and moves the replay
 * with every step. `index` is -1 until the tour starts. An answer keeps its stops only for the
 * Run it was written about: after a new Run its event numbers would point at unrelated events.
 */
export function useAiTour(options: AiTourOptions) {
  // Plain maps on purpose: they memoize, they are not state the UI reacts to.
  const runOf = new Map<number, StopResolver | null>()
  const cache = new Map<number, { content: string; complete: boolean; resolve: StopResolver; answer: TourAnswer }>()

  const answers = computed(() => {
    const parsed = new Map<number, TourAnswer>()
    const all = options.messages.value
    all.forEach((m, i) => {
      if (m.role !== 'assistant') return
      if (!runOf.has(m.id)) runOf.set(m.id, options.resolver.value)
      const own = runOf.get(m.id)
      const resolve = own && own === options.resolver.value ? own : NO_STOPS
      const complete = !(options.streaming.value && i === all.length - 1)
      const hit = cache.get(m.id)
      if (hit && hit.content === m.content && hit.complete === complete && hit.resolve === resolve) {
        parsed.set(m.id, hit.answer)
        return
      }
      const answer = parseTourAnswer(m.content, resolve, complete)
      cache.set(m.id, { content: m.content, complete, resolve, answer })
      parsed.set(m.id, answer)
    })
    return parsed
  })

  const latestWithStops = computed(() => {
    let id: number | null = null
    for (const [messageId, answer] of answers.value) if (answer.stops.length > 0) id = messageId
    return id
  })

  const chosen = shallowRef<{ messageId: number; index: number } | null>(null)
  // A new answer with stops, or a new Run, starts the tour over, waiting at its beginning.
  watch([latestWithStops, options.resolver], () => (chosen.value = null))

  const messageId = computed(() =>
    chosen.value && answers.value.get(chosen.value.messageId)?.stops.length ? chosen.value.messageId : latestWithStops.value)
  const stops = computed(() => (messageId.value === null ? [] : (answers.value.get(messageId.value)?.stops ?? [])))
  const index = computed(() =>
    chosen.value?.messageId === messageId.value ? Math.min(chosen.value.index, stops.value.length - 1) : -1)

  function go(id: number, i: number) {
    const all = answers.value.get(id)?.stops ?? []
    const stop = all[i]
    if (!stop) return
    chosen.value = { messageId: id, index: i }
    options.seek(stop.seq)
    options.onStop?.(stop, i, all.length)
  }

  // Once the tour has started, stepping or scrubbing onto one of its stops makes it the current
  // stop. Before that, a replay passing a stop does not start the tour by itself.
  watch(options.position, (pos) => {
    const id = messageId.value
    if (id === null || index.value === -1 || stops.value[index.value]?.seq === pos) return
    const found = stops.value.findIndex((s) => s.seq === pos)
    if (found !== -1) chosen.value = { messageId: id, index: found }
  })

  return {
    answers,
    messageId,
    stops,
    index,
    go,
    next: () => messageId.value !== null && go(messageId.value, Math.min(index.value + 1, stops.value.length - 1)),
    prev: () => messageId.value !== null && go(messageId.value, Math.max(index.value - 1, 0)),
  }
}

export type AiTour = ReturnType<typeof useAiTour>
