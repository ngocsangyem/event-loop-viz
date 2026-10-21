import { describe, expect, it } from 'vitest'
import { TRACE_EVENT_SCHEMA } from '../../trace/trace-event-schema'
import type { FieldSpec } from '../../trace/trace-event-schema'
import type { TraceEvent } from '../../trace/trace-event'
import { EN_PHRASES, explainEvent, phrasesFor } from '../explain-event'
import { VI_PHRASES } from '../explain-phrases-vi'
import { timerAndJobTrace } from './hand-built-traces'

/** One sample event per kind, with every optional field filled in. */
function sampleEvent(kind: string, seq: number): TraceEvent {
  const fields = Object.entries(TRACE_EVENT_SCHEMA[kind as keyof typeof TRACE_EVENT_SCHEMA]) as [
    string,
    FieldSpec,
  ][]
  const body = Object.fromEntries(
    fields.map(([name, spec]) => [
      name,
      spec.type === 'enum' ? spec.values![0] : spec.type === 'number' ? 7 : spec.type === 'boolean' ? true : 'x1',
    ]),
  )
  return { seq, t: 0, ref: 'ES:#sec-x', visible: true, k: kind, ...body } as unknown as TraceEvent
}

describe('explain phrasebooks', () => {
  const kinds = Object.keys(TRACE_EVENT_SCHEMA)

  it('Vietnamese and English both define a sentence for every Trace Event kind', () => {
    for (const phrases of [EN_PHRASES, VI_PHRASES]) {
      expect(Object.keys(phrases.describe).sort()).toEqual([...kinds].sort())
    }
  })

  it('Vietnamese explains every kind in Vietnamese without leaking placeholders', () => {
    // The console line only wraps the printed text, so it may match English.
    const translated = kinds.filter((kind) => kind !== 'console')
    kinds.forEach((kind, i) => {
      const event = sampleEvent(kind, i)
      const { text } = explainEvent(event, [event], VI_PHRASES)
      expect(text.length).toBeGreaterThan(10)
      expect(text).not.toMatch(/undefined|NaN|\[object|null/)
    })
    const differing = translated.filter((kind, i) => {
      const event = sampleEvent(kind, i)
      return explainEvent(event, [event], VI_PHRASES).text !== explainEvent(event, [event]).text
    })
    expect(differing).toEqual(translated)
  })

  it('explains every event of a hand-built Trace in both languages', () => {
    const { events } = timerAndJobTrace()
    for (const event of events) {
      expect(explainEvent(event, events, VI_PHRASES).text.trim()).not.toBe('')
      expect(explainEvent(event, events, EN_PHRASES).text.trim()).not.toBe('')
    }
  })

  it('keeps the English wording', () => {
    const events = [
      { seq: 0, t: 0, ref: 'ES:#a', visible: true, k: 'timer:init', tid: '1', requestedMs: 1, clampedMs: 4, nesting: 6, repeat: true, loc: { start: 0, end: 1, line: 2, column: 1 } },
      { seq: 1, t: 0, ref: 'ES:#a', visible: true, k: 'timer:clear', tid: '1' },
    ] as TraceEvent[]
    expect(explainEvent(events[0]!, events).text).toBe(
      'Timer 1 was set for 1 ms, raised to 4 ms because deeply nested timers wait at least 4 ms (nesting level 6), repeating. Its callback becomes a Task once that much virtual time passes.',
    )
    expect(explainEvent(events[1]!, events).text).toBe(
      'The timer set on line 2 was cleared, so its callback will not run.',
    )
  })

  it('names a promise by its line in Vietnamese', () => {
    const events = [
      { seq: 0, t: 0, ref: 'ES:#a', visible: false, k: 'promise:create', pid: 'p1', loc: { start: 0, end: 5, line: 3, column: 1 } },
      { seq: 1, t: 0, ref: 'ES:#b', visible: true, k: 'promise:settle', pid: 'p1', state: 'fulfilled' },
    ] as TraceEvent[]
    expect(explainEvent(events[1]!, events, phrasesFor('vi')).text).toBe(
      'Promise ở dòng 3 đã fulfilled, nên các reaction của nó được xếp vào hàng đợi thành Job, chạy ở Checkpoint kế tiếp.',
    )
  })

  it('picks the phrasebook for a locale', () => {
    expect(phrasesFor('en')).toBe(EN_PHRASES)
    expect(phrasesFor('vi')).toBe(VI_PHRASES)
  })
})
