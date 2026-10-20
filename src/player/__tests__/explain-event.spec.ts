import { describe, expect, it } from 'vitest'
import { TRACE_EVENT_SCHEMA } from '../../trace/trace-event-schema'
import type { FieldSpec } from '../../trace/trace-event-schema'
import type { TraceEvent } from '../../trace/trace-event'
import { explainEvent, specLink } from '../explain-event'
import { EVENT_FAMILIES, eventFamily } from '../event-family'

function sampleValue(spec: FieldSpec): unknown {
  switch (spec.type) {
    case 'string':
      return 'x1'
    case 'number':
      return 7
    case 'boolean':
      return true
    case 'enum':
      return spec.values![0]
    case 'string-array':
      return []
    case 'object':
      return {}
  }
}

/** Every combination of enum values for one kind, with optional fields both present and absent. */
function variantsOf(kind: string): TraceEvent[] {
  const fields = Object.entries(TRACE_EVENT_SCHEMA[kind as keyof typeof TRACE_EVENT_SCHEMA]) as [
    string,
    FieldSpec,
  ][]
  let combos: Record<string, unknown>[] = [{}]
  for (const [name, spec] of fields) {
    const values: unknown[] =
      spec.type === 'enum'
        ? [...spec.values!]
        : spec.type === 'boolean'
          ? [true, false]
          : [sampleValue(spec)]
    const options = spec.optional ? [...values, undefined] : values
    combos = combos.flatMap((c) => options.map((v) => (v === undefined ? c : { ...c, [name]: v })))
  }
  return combos.map(
    (c, i) =>
      ({ seq: i, t: 0, ref: 'ES:#sec-x', visible: true, k: kind, ...c }) as unknown as TraceEvent,
  )
}

describe('explainEvent', () => {
  it('has a clean explanation template for every Trace Event kind in schema v1', () => {
    for (const kind of Object.keys(TRACE_EVENT_SCHEMA)) {
      for (const event of variantsOf(kind)) {
        const { text } = explainEvent(event, [event])
        expect(text.length, kind).toBeGreaterThan(10)
        expect(text, kind).not.toMatch(/undefined|NaN|\[object|null/)
      }
      expect(EVENT_FAMILIES, kind).toContain(eventFamily(kind as TraceEvent['k']))
    }
  })

  it('names a promise by the line that created it', () => {
    const events = [
      {
        seq: 0,
        t: 0,
        ref: 'ES:#sec-promise-executor',
        visible: false,
        k: 'promise:create',
        pid: 'p1',
        loc: { start: 0, end: 5, line: 3, column: 1 },
      },
      {
        seq: 1,
        t: 0,
        ref: 'ES:#sec-fulfillpromise',
        visible: true,
        k: 'promise:settle',
        pid: 'p1',
        state: 'fulfilled',
      },
    ] as TraceEvent[]
    expect(explainEvent(events[1]!, events).text).toBe(
      'The promise from line 3 fulfilled, so its reactions are queued as Jobs that run at the next Checkpoint.',
    )
  })

  it('links ES and HTML refs to their specs', () => {
    expect(specLink('ES:#sec-fulfillpromise').url).toBe(
      'https://tc39.es/ecma262/#sec-fulfillpromise',
    )
    expect(specLink('HTML:event-loop').url).toBe('https://html.spec.whatwg.org/#event-loop')
  })
})
