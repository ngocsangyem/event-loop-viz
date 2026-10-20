// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  TRACE_EVENT_SCHEMA,
  validateTraceEvent,
  validateTraceHeader,
} from '../../trace/trace-event-schema'
import { runScript } from '../run-script'

const fixturesDir = fileURLToPath(new URL('../../../oracle/fixtures/', import.meta.url))

describe('Trace events emitted by real Runs conform to the schema', () => {
  it('emits only valid events and headers, and every schema kind appears across the corpus', async () => {
    const scripts = readdirSync(fixturesDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(fixturesDir + f, 'utf8'))
    scripts.push(`console.log(1); while (true) {}`)
    // return() on a not-yet-started async generator awaits its argument
    scripts.push(`async function* g() { yield 1 }\ng().return(Promise.resolve(2))`)
    const seen = new Set<string>()
    const problems: string[] = []
    for (const script of scripts) {
      const result = await runScript(script, { budgets: { nodes: 20_000 } })
      if (result.kind !== 'ran') continue
      problems.push(...validateTraceHeader(result.trace.header))
      for (const event of result.trace.events) {
        seen.add(event.k)
        problems.push(...validateTraceEvent(event))
      }
    }
    expect(problems).toEqual([])
    expect([...seen].sort()).toEqual(Object.keys(TRACE_EVENT_SCHEMA).sort())
  })
})
