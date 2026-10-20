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

describe('await suspend and resume', () => {
  it('records a suspend naming the awaited promise, then a resume in mode next', async () => {
    const trace = await traceOf(`(async () => { await Promise.resolve(1) })()`)
    const [suspend] = eventsOf(trace, 'await:suspend')
    const [resume] = eventsOf(trace, 'await:resume')
    const [reaction] = eventsOf(trace, 'promise:reaction')
    expect(suspend).toMatchObject({ awaitedPid: reaction!.pid })
    expect(resume).toMatchObject({ fid: suspend!.fid, mode: 'next' })
    expect(suspend!.seq).toBeLessThan(resume!.seq)
  })

  it('records mode throw when the awaited promise rejects', async () => {
    const trace = await traceOf(`(async () => { try { await Promise.reject(1) } catch {} })()`)
    expect(eventsOf(trace, 'await:resume').map((e) => e.mode)).toEqual(['throw'])
  })

  it('uses the frame id of the async function as fid', async () => {
    const trace = await traceOf(`async function f() { await 1 }\nf()`)
    const [suspend] = eventsOf(trace, 'await:suspend')
    const frame = eventsOf(trace, 'frame:push').find((e) => e.frameId === suspend!.fid)
    expect(frame).toMatchObject({ label: 'f' })
  })

  it('keeps separate fids for separate async function calls', async () => {
    const trace = await traceOf(`async function f() { await 1 }\nf(); f()`)
    const fids = eventsOf(trace, 'await:suspend').map((e) => e.fid)
    expect(new Set(fids).size).toBe(2)
  })

  it('shows an await that never resumes as suspended with no resume and no return', async () => {
    const trace = await traceOf(`(async () => { await new Promise(() => {}); console.log('after') })()`)
    expect(eventsOf(trace, 'await:suspend')).toHaveLength(1)
    expect(eventsOf(trace, 'await:resume')).toHaveLength(0)
    expect(eventsOf(trace, 'console')).toHaveLength(0)
  })

  it('records one suspend/resume pair per await in order', async () => {
    const trace = await traceOf(`(async () => { await 1; await 2 })()`)
    expect(trace.events.filter((e) => e.k.startsWith('await:')).map((e) => e.k)).toEqual([
      'await:suspend',
      'await:resume',
      'await:suspend',
      'await:resume',
    ])
  })
})

describe('golden await Trace', () => {
  const goldenPath = fileURLToPath(new URL('../../../tests/golden/await-suspend-resume.golden.json', import.meta.url))
  const CASES: Record<string, string> = {
    'await that resumes': `(async () => { await Promise.resolve(1); console.log('mark') })()`,
    'await that throws': `(async () => { try { await Promise.reject(1) } catch {} })()`,
    'await that never resumes': `(async () => { await new Promise(() => {}); console.log('mark') })()`,
  }
  /** Await and Job events in order; the console line shows where the continuation ran. */
  const project = (trace: Trace) =>
    trace.events
      .filter((e) => e.k.startsWith('await:') || e.k === 'job:begin' || e.k === 'console')
      .map((e) => {
        const fields = Object.entries(e)
          .filter(([key]) => ['fid', 'awaitedPid', 'mode', 'jobId', 'text'].includes(key))
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
