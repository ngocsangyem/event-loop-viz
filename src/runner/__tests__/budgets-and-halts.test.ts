// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { RunResult, RunSettings } from '../run-script'

type Ran = Extract<RunResult, { kind: 'ran' }>

async function ran(script: string, settings: RunSettings = {}): Promise<Ran> {
  const result = await runScript(script, settings)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

const lastEvent = (r: Ran) => r.trace.events[r.trace.events.length - 1]!

describe('Budgets and Halts', () => {
  it('halts an infinite loop on the node Budget at the same seq every Run', async () => {
    const script = `console.log('start'); while (true) {}`
    const a = await ran(script, { budgets: { nodes: 5_000 } })
    const b = await ran(script, { budgets: { nodes: 5_000 } })
    expect(lastEvent(a)).toMatchObject({ k: 'run:halted', reason: 'nodes', limit: 5_000 })
    expect(lastEvent(a).seq).toBe(lastEvent(b).seq)
    expect(a.observableOutput).toEqual([{ kind: 'console', level: 'log', text: 'start' }])
  })

  it('halts on the default node Budget of 2M for an unconfigured infinite loop', async () => {
    const r = await ran(`while (true) {}`)
    expect(lastEvent(r)).toMatchObject({ k: 'run:halted', reason: 'nodes', limit: 2_000_000 })
  })

  it('halts when too many Tasks are queued', async () => {
    const r = await ran(`setInterval(() => {}, 1)`, { budgets: { tasks: 50 } })
    expect(lastEvent(r)).toMatchObject({ k: 'run:halted', reason: 'tasks', limit: 50 })
  })

  it('halts when the Virtual Clock passes the virtual time Budget', async () => {
    const r = await ran(`setInterval(() => {}, 100)`, { budgets: { virtualMs: 1_000 } })
    expect(lastEvent(r)).toMatchObject({ k: 'run:halted', reason: 'virtual-time', limit: 1_000 })
    expect(lastEvent(r).t).toBeGreaterThan(1_000_000)
  })

  it('halts when the event Budget is exhausted, keeping the Trace to the limit plus the Halt', async () => {
    const r = await ran(`for (let i = 0; i < 100; i++) console.log(i)`, { budgets: { events: 20 } })
    expect(lastEvent(r)).toMatchObject({ k: 'run:halted', reason: 'events', limit: 20 })
    expect(r.trace.events).toHaveLength(21)
    expect(r.trace.events.map((e) => e.seq)).toEqual(r.trace.events.map((_, i) => i))
  })

  it('ends a finishing Run with a natural Halt', async () => {
    const r = await ran(`console.log(1)`)
    expect(lastEvent(r)).toMatchObject({ k: 'run:halted', reason: 'natural' })
  })
})

describe('syntax errors', () => {
  it('returns syntax-error with line and column and runs nothing', async () => {
    const result = await runScript(`console.log('never printed');\nlet = ;`)
    expect(result).toMatchObject({ kind: 'syntax-error', line: 2 })
    expect(result).not.toHaveProperty('trace')
    expect(result).not.toHaveProperty('observableOutput')
    expect((result as { column: number }).column).toBeGreaterThan(0)
  })
})

describe('seeded Math.random', () => {
  const script = `console.log(Math.random(), Math.random())`
  const out = async (seed: number) => (await ran(script, { randomSeed: seed })).observableOutput

  it('gives the same output for the same seed', async () => {
    expect(await out(7)).toEqual(await out(7))
  })

  it('gives different output for a different seed', async () => {
    expect(await out(7)).not.toEqual(await out(8))
  })

  it('records the seed in the header and returns values in [0, 1)', async () => {
    const r = await ran(`console.log(Math.random())`, { randomSeed: 42 })
    expect(r.trace.header.randomSeed).toBe(42)
    const value = Number((r.observableOutput[0] as { text: string }).text)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  })
})
