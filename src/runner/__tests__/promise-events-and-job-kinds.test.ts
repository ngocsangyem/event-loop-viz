// @vitest-environment node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { Trace, TraceEvent } from '../../trace/trace-event'

async function traceOf(script: string): Promise<Trace> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.trace
}

type Of<K extends TraceEvent['k']> = Extract<TraceEvent, { k: K }>

function eventsOf<K extends TraceEvent['k']>(trace: Trace, k: K): Of<K>[] {
  return trace.events.filter((e): e is Of<K> => e.k === k)
}

/**
 * Tick of every Job, from the Trace alone: a Job enqueued by script code runs in Tick 1,
 * a Job enqueued while a Job of Tick n runs, in Tick n + 1 (event-loop research, section 3).
 */
function jobTicks(trace: Trace): Map<string, number> {
  const ticks = new Map<string, number>()
  let running: string | undefined
  for (const e of trace.events) {
    if (e.k === 'job:enqueue') ticks.set(e.jobId, (running ? (ticks.get(running) ?? 0) : 0) + 1)
    else if (e.k === 'job:begin') running = e.jobId
    else if (e.k === 'job:end') running = undefined
  }
  return ticks
}

/** Tick in which the Script logged 'mark'; 0 means synchronously, before any Job. */
function markTick(trace: Trace): number {
  const ticks = jobTicks(trace)
  let running: string | undefined
  for (const e of trace.events) {
    if (e.k === 'job:begin') running = e.jobId
    else if (e.k === 'job:end') running = undefined
    else if (e.k === 'console' && e.text === 'mark') return running ? (ticks.get(running) ?? -1) : 0
  }
  throw new Error('script never logged mark')
}

const mark = `console.log('mark')`

// Expected Tick counts are the Chrome 155 measurements in docs/research/event-loop-semantics.md, section 4.
const TICK_CASES: { name: string; script: string; tick: number; kinds: string[] }[] = [
  {
    name: 'await of a native promise',
    script: `(async () => { await Promise.resolve(1); ${mark} })()`,
    tick: 1,
    kinds: ['reaction'],
  },
  {
    name: 'await of a non-promise',
    script: `(async () => { await 1; ${mark} })()`,
    tick: 1,
    kinds: ['reaction'],
  },
  {
    name: 'await of a thenable',
    script: `(async () => { await { then(r) { r(1) } }; ${mark} })()`,
    tick: 2,
    kinds: ['thenable', 'reaction'],
  },
  {
    name: 'return of a promise from an async function',
    script: `(async () => { return Promise.resolve(1) })().then(() => ${mark})`,
    tick: 3,
    kinds: ['thenable', 'reaction', 'reaction'],
  },
  {
    name: 'return await of a promise from an async function',
    script: `(async () => { return await Promise.resolve(1) })().then(() => ${mark})`,
    tick: 2,
    kinds: ['reaction', 'reaction'],
  },
  {
    name: 'resolve with a native promise',
    script: `new Promise((r) => r(Promise.resolve(1))).then(() => ${mark})`,
    tick: 3,
    kinds: ['thenable', 'reaction', 'reaction'],
  },
  {
    name: 'resolve with a synchronous thenable',
    script: `new Promise((r) => r({ then(f) { f(1) } })).then(() => ${mark})`,
    tick: 2,
    kinds: ['thenable', 'reaction'],
  },
  {
    name: 'resolve with a plain value',
    script: `new Promise((r) => r(1)).then(() => ${mark})`,
    tick: 1,
    kinds: ['reaction'],
  },
  {
    name: 'Promise.resolve of a native promise keeps its identity',
    script: `const p = Promise.resolve(1); Promise.resolve(p).then(() => ${mark})`,
    tick: 1,
    kinds: ['reaction'],
  },
]

describe('Job kinds and Tick numbers', () => {
  for (const c of TICK_CASES) {
    it(`${c.name}: continues in Tick ${c.tick}`, async () => {
      const trace = await traceOf(c.script)
      expect(markTick(trace)).toBe(c.tick)
      expect(eventsOf(trace, 'job:enqueue').map((e) => e.jobKind)).toEqual(c.kinds)
    })
  }

  it('tags queueMicrotask callbacks as microtask Jobs without a promise', async () => {
    const trace = await traceOf(`queueMicrotask(() => {})`)
    const [job] = eventsOf(trace, 'job:enqueue')
    expect(job).toMatchObject({ jobKind: 'microtask' })
    expect(job).not.toHaveProperty('pid')
    expect(job).not.toHaveProperty('outcome')
  })

  it('records the outcome of the reaction a Job runs', async () => {
    const trace = await traceOf(`
      Promise.resolve(1).then(() => {})
      Promise.reject(new Error('x')).catch(() => {})
    `)
    expect(eventsOf(trace, 'job:enqueue').map((e) => e.outcome)).toEqual(['fulfill', 'reject'])
  })

  it('gives every Job in every Fixture a known kind, with a promise unless it is a microtask', () => {
    const dir = fileURLToPath(new URL('../../../oracle/fixtures/', import.meta.url))
    // Skipped Fixtures cover behavior the host does not run yet (e.g. a Script that never halts).
    const fixtures = readdirSync(dir).filter(
      (f) =>
        f.endsWith('.js') &&
        JSON.parse(readFileSync(dir + f.replace(/\.js$/, '.golden.json'), 'utf8')).status !== 'skip',
    )
    expect(fixtures.length).toBeGreaterThan(0)
    return Promise.all(
      fixtures.map(async (file) => {
        const result = await runScript(readFileSync(dir + file, 'utf8'))
        if (result.kind !== 'ran') return
        for (const e of eventsOf(result.trace, 'job:enqueue')) {
          expect(['reaction', 'thenable', 'microtask'], file).toContain(e.jobKind)
          if (e.jobKind !== 'microtask') expect(e.pid, file).toMatch(/^p\d+$/)
          if (e.jobKind === 'reaction') expect(['fulfill', 'reject'], file).toContain(e.outcome)
        }
      }),
    )
  })
})

describe('promise events', () => {
  it('records create, resolve and settle for a promise resolved by its executor', async () => {
    const trace = await traceOf(`new Promise((r) => r(1))`)
    const kinds = trace.events.map((e) => e.k).filter((k) => k.startsWith('promise:'))
    expect(kinds).toEqual(['promise:create', 'promise:resolve', 'promise:settle'])
    expect(eventsOf(trace, 'promise:resolve')[0]).toMatchObject({ pid: 'p1', with: 'value' })
    expect(eventsOf(trace, 'promise:settle')[0]).toMatchObject({ pid: 'p1', state: 'fulfilled' })
  })

  it('distinguishes resolving with a value, a thenable and the promise itself', async () => {
    const trace = await traceOf(`
      new Promise((r) => r(1))
      new Promise((r) => r({ then() {} }))
      let self
      self = new Promise((r) => setTimeout(() => r(self), 0))
    `)
    expect(eventsOf(trace, 'promise:resolve').map((e) => e.with)).toEqual(['value', 'thenable', 'self'])
    expect(eventsOf(trace, 'promise:settle').map((e) => e.state)).toEqual(['fulfilled', 'rejected'])
  })

  it('records then() as a reaction, pending or not depending on the promise state', async () => {
    const trace = await traceOf(`
      new Promise(() => {}).then(() => {})
      Promise.resolve(1).then(() => {})
    `)
    expect(eventsOf(trace, 'promise:reaction').map((e) => [e.via, e.pending])).toEqual([
      ['then', true],
      ['then', false],
    ])
  })

  it('labels the reaction that await registers', async () => {
    const trace = await traceOf(`(async () => { await Promise.resolve(1) })()`)
    expect(eventsOf(trace, 'promise:reaction').map((e) => e.via)).toEqual(['await'])
  })

  it('marks a promise nobody ever observes as a Bookkeeping Event', async () => {
    const trace = await traceOf(`
      new Promise(() => {})
      new Promise((r) => r(1))
    `)
    expect(eventsOf(trace, 'promise:create').map((e) => [e.pid, e.visible])).toEqual([
      ['p1', false],
      ['p2', true],
    ])
  })

  it('freezes events so a Trace can be shared without copying', async () => {
    const trace = await traceOf(`Promise.resolve(1).then(() => {})`)
    expect(trace.events.every((e) => Object.isFrozen(e))).toBe(true)
  })
})

describe('cause links', () => {
  const causeOf = (trace: Trace, e: TraceEvent): TraceEvent | undefined =>
    e.cause === undefined ? undefined : trace.events[e.cause]

  it('points a Job for an already settled promise at the reaction that registered it', async () => {
    const trace = await traceOf(`Promise.resolve(1).then(() => {})`)
    const [job] = eventsOf(trace, 'job:enqueue')
    expect(causeOf(trace, job!)).toMatchObject({ k: 'promise:reaction', pid: job!.pid, pending: false })
  })

  it('points a Job for a pending promise at the settle that released it', async () => {
    const trace = await traceOf(`
      const p = new Promise((r) => setTimeout(() => r(1), 0))
      p.then(() => {})
    `)
    const [job] = eventsOf(trace, 'job:enqueue')
    expect(causeOf(trace, job!)).toMatchObject({ k: 'promise:settle', pid: job!.pid })
  })

  it('points a thenable Job at the resolve that discovered the thenable', async () => {
    const trace = await traceOf(`new Promise((r) => r({ then(f) { f(1) } }))`)
    const [job] = eventsOf(trace, 'job:enqueue')
    expect(job).toMatchObject({ jobKind: 'thenable' })
    expect(causeOf(trace, job!)).toMatchObject({ k: 'promise:resolve', pid: job!.pid, with: 'thenable' })
  })

  it('points job:begin at its job:enqueue', async () => {
    const trace = await traceOf(`Promise.resolve(1).then(() => {})`)
    const [enqueue] = eventsOf(trace, 'job:enqueue')
    const begin = trace.events.find((e) => e.k === 'job:begin')
    expect(begin!.cause).toBe(enqueue!.seq)
  })
})

describe('golden Traces', () => {
  const goldenPath = fileURLToPath(new URL('../../../tests/golden/promise-job-flow.golden.json', import.meta.url))
  const golden: Record<string, string[]> = JSON.parse(readFileSync(goldenPath, 'utf8'))

  /** Promise and Job events only, with causes shown as the kind of the cause event. */
  function project(trace: Trace): string[] {
    const keep = (k: string) => k.startsWith('promise:') || k === 'job:enqueue' || k === 'job:begin'
    return trace.events
      .filter((e) => keep(e.k))
      .map((e) => {
        const { k, visible } = e
        const fields = Object.entries(e)
          .filter(([key]) => !['seq', 't', 'ref', 'loc', 'cause', 'k', 'visible'].includes(key))
          .map(([key, value]) => `${key}=${String(value)}`)
        const cause = e.cause === undefined ? '' : ` <- ${trace.events[e.cause]!.k}#${e.cause}`
        return `${k}${visible ? '' : ' (bookkeeping)'} ${fields.join(' ')}${cause}`.replace(/\s+/g, ' ')
      })
  }

  // Goldens change only deliberately: UPDATE_GOLDEN=1 rewrites them, then review the diff.
  it.runIf(process.env.UPDATE_GOLDEN)('regenerates the golden file', async () => {
    const next: Record<string, string[]> = {}
    for (const c of TICK_CASES) next[c.name] = project(await traceOf(c.script))
    writeFileSync(goldenPath, JSON.stringify(next, null, 2) + '\n')
  })

  for (const c of TICK_CASES) {
    it.skipIf(process.env.UPDATE_GOLDEN)(`${c.name}`, async () => {
      expect(project(await traceOf(c.script))).toEqual(golden[c.name])
    })
  }
})
