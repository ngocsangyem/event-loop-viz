// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { RunResult } from '../run-script'

type Ran = Extract<RunResult, { kind: 'ran' }>

async function ran(script: string): Promise<Ran> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

const logs = (r: Ran) => r.observableOutput.map((o) => (o.kind === 'console' ? o.text : o.kind))

describe('Virtual Clock reads', () => {
  it('Date.now and performance.now advance with evaluated nodes, not wall time', async () => {
    const r = await ran(`
      const d0 = Date.now(), p0 = performance.now();
      for (let i = 0; i < 3000; i++) {}
      console.log(Date.now() - d0 >= 3, performance.now() - p0 >= 3, performance.now() - p0 < 100);
    `)
    expect(logs(r)).toEqual(['true true true'])
  })

  it('is identical across Runs', async () => {
    const script = `for (let i = 0; i < 500; i++) {} console.log(performance.now())`
    expect(logs(await ran(script))).toEqual(logs(await ran(script)))
  })

  it('a timer fires at its Virtual Clock due time', async () => {
    const r = await ran(`setTimeout(() => console.log(Math.round(performance.now())), 50)`)
    expect(logs(r)).toEqual(['50'])
  })
})

describe('timer:init and setInterval', () => {
  it('records requested and clamped delay and nesting; clamps from the 7th nested level, as the Oracle does', async () => {
    const r = await ran(`
      let n = 0
      function step() { if (++n < 8) setTimeout(step, 0) }
      setTimeout(step, 0)
    `)
    const inits = r.trace.events.filter((e) => e.k === 'timer:init')
    expect(inits.map((e) => [e.nesting, e.requestedMs, e.clampedMs])).toEqual([
      [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 0], [6, 0, 0], [7, 0, 4], [8, 0, 4],
    ])
  })

  it('a nested interval keeps its nesting level growing and stops once cleared', async () => {
    const r = await ran(`
      let c = 0
      const id = setInterval(() => { if (++c === 7) clearInterval(id) }, 1)
    `)
    const inits = r.trace.events.filter((e) => e.k === 'timer:init')
    expect(inits.map((e) => e.nesting)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(inits[inits.length - 1]).toMatchObject({ clampedMs: 4, requestedMs: 1 })
    expect(r.trace.events.filter((e) => e.k === 'timer:fire')).toHaveLength(7)
  })
})

describe('timingSensitive', () => {
  it('is true when a timer is due within 2 ms of the end of a compute stretch', async () => {
    const r = await ran(`
      setTimeout(() => console.log('t'), 5)
      const s = Date.now()
      while (Date.now() - s < 5) {}
    `)
    expect(r.trace.header.timingSensitive).toBe(true)
  })

  it('is false when every timer is far from any compute boundary', async () => {
    const r = await ran(`
      setTimeout(() => console.log('t'), 1000)
      const s = Date.now()
      while (Date.now() - s < 5) {}
    `)
    expect(r.trace.header.timingSensitive).toBe(false)
  })

  it('is false for trivially short scripts with zero delay timers', async () => {
    const r = await ran(`setTimeout(() => console.log('a'), 0); setTimeout(() => console.log('b'), 1)`)
    expect(r.trace.header.timingSensitive).toBe(false)
  })
})
