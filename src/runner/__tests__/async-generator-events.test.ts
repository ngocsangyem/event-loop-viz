// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { Trace, TraceEvent } from '../../trace/trace-event'

async function traceOf(script: string): Promise<Trace> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.trace
}

type Of<K extends TraceEvent['k']> = TraceEvent & { k: K }
const eventsOf = <K extends TraceEvent['k']>(trace: Trace, k: K) =>
  trace.events.filter((e): e is Of<K> => e.k === k)

describe('async generator events', () => {
  it('records a resume when next() starts the generator, then a yield, on the same gid', async () => {
    const trace = await traceOf(`async function* g() { yield 1 }\ng().next()`)
    const [resume] = eventsOf(trace, 'asyncgen:resume')
    const [yielded] = eventsOf(trace, 'asyncgen:yield')
    expect(resume).toBeDefined()
    expect(yielded).toMatchObject({ gid: resume!.gid })
    expect(resume!.seq).toBeLessThan(yielded!.seq)
  })

  it('gives each generator object its own gid', async () => {
    const trace = await traceOf(`async function* g() { yield 1 }\ng().next(); g().next()`)
    const gids = eventsOf(trace, 'asyncgen:resume').map((e) => e.gid)
    expect(new Set(gids).size).toBe(2)
  })

  it('records a yield per yielded value and a resume per continuation', async () => {
    const trace = await traceOf(
      `async function* g() { yield 1; yield 2 }\nconst it = g(); it.next(); it.next(); it.next()`,
    )
    expect(eventsOf(trace, 'asyncgen:yield')).toHaveLength(2)
    expect(eventsOf(trace, 'asyncgen:resume')).toHaveLength(3)
  })

  it('records return-await when return() is called on a not-yet-started generator', async () => {
    const trace = await traceOf(`async function* g() { yield 1 }\ng().return(5)`)
    expect(eventsOf(trace, 'asyncgen:return-await')).toHaveLength(1)
    expect(eventsOf(trace, 'asyncgen:resume')).toHaveLength(0)
    const reactions = eventsOf(trace, 'promise:reaction').filter((e) => e.via === 'asyncgen')
    expect(reactions).toHaveLength(1)
  })

  it('keeps the implicit await of a yielded promise distinct from the yield', async () => {
    const trace = await traceOf(`async function* g() { yield Promise.resolve('v') }\ng().next()`)
    const suspend = eventsOf(trace, 'await:suspend')[0]!
    const [yielded] = eventsOf(trace, 'asyncgen:yield')
    expect(suspend.seq).toBeLessThan(yielded!.seq)
    expect(eventsOf(trace, 'await:resume')[0]!.seq).toBeLessThan(yielded!.seq)
    expect(suspend.fid).not.toBe(yielded!.gid)
  })

  it('does not record asyncgen events for async functions or sync generators', async () => {
    const trace = await traceOf(`async function f() { await 1 }\nf(); function* s() { yield 1 }\ns().next()`)
    expect(trace.events.some((e) => e.k.startsWith('asyncgen:'))).toBe(false)
  })
})

describe('for await', () => {
  it('attaches the from-sync reaction when iterating a sync iterable', async () => {
    const trace = await traceOf(`(async () => { for await (const v of [Promise.resolve(1), 2]) {} })()`)
    const vias = eventsOf(trace, 'promise:reaction').map((e) => e.via)
    // One continuation per element plus one for the final done result.
    expect(vias.filter((v) => v === 'from-sync')).toHaveLength(3)
  })

  it('drives an async generator through resume and yield for every loop turn', async () => {
    const trace = await traceOf(
      `async function* g() { yield 1; yield 2 }\n(async () => { for await (const v of g()) {} })()`,
    )
    expect(eventsOf(trace, 'asyncgen:yield')).toHaveLength(2)
    expect(eventsOf(trace, 'asyncgen:resume')).toHaveLength(3)
  })
})

describe('golden async generator Trace', () => {
  const goldenPath = fileURLToPath(new URL('../../../tests/golden/async-generator-events.golden.json', import.meta.url))
  const CASES: Record<string, string> = {
    'yield awaits its operand': `async function* g() { yield Promise.resolve('v'); console.log('after') }\ng().next()`,
    'return on a fresh generator awaits the value': `async function* g() { yield 1 }\ng().return(Promise.resolve(5))`,
    'for await over a sync iterable of promises': `(async () => { for await (const v of [Promise.resolve('x')]) console.log(v) })()`,
  }
  const WATCHED = (k: string) =>
    k.startsWith('asyncgen:') || k.startsWith('await:') || ['job:begin', 'console', 'promise:reaction'].includes(k)
  /** Generator, await and reaction events plus Job starts, in order. */
  const project = (trace: Trace) =>
    trace.events
      .filter((e) => WATCHED(e.k))
      .map((e) => {
        const fields = Object.entries(e)
          .filter(([key]) => ['gid', 'fid', 'via', 'mode', 'jobId', 'text'].includes(key))
          .map(([key, value]) => `${key}=${String(value)}`)
        return `${e.k} ${fields.join(' ')}`.trim()
      })

  it.runIf(process.env.UPDATE_GOLDEN)('regenerates the golden file', async () => {
    const next: Record<string, string[]> = {}
    for (const [name, script] of Object.entries(CASES)) next[name] = project(await traceOf(script))
    writeFileSync(goldenPath, JSON.stringify(next, null, 2) + '\n')
    expect(Object.keys(next)).toHaveLength(Object.keys(CASES).length)
  })

  for (const [name, script] of Object.entries(CASES)) {
    it.skipIf(process.env.UPDATE_GOLDEN)(`${name}`, async () => {
      const golden: Record<string, string[]> = JSON.parse(readFileSync(goldenPath, 'utf8'))
      expect(project(await traceOf(script))).toEqual(golden[name])
    })
  }
})
