// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { RunResult } from '../run-script'

/**
 * Skipped Fixtures are not compared with Chrome, but each one still has a simulator-side
 * expectation here. Adding a skipped Fixture without an entry fails the coverage test.
 */
const fixturesDir = fileURLToPath(new URL('../../../oracle/fixtures/', import.meta.url))
const source = (name: string) => readFileSync(fixturesDir + name, 'utf8')

async function ran(name: string, settings = {}) {
  const result: RunResult = await runScript(source(name), settings)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

const expectations: Record<string, () => Promise<void>> = {
  'infinite-loop-halts.js': async () => {
    const { trace, observableOutput } = await ran('infinite-loop-halts.js', {
      budgets: { nodes: 5_000 },
    })
    expect(trace.events[trace.events.length - 1]).toMatchObject({
      k: 'run:halted',
      reason: 'nodes',
      limit: 5_000,
    })
    expect(observableOutput).toEqual([{ kind: 'console', level: 'log', text: 'start' }])
  },
  'math-random-seeded.js': async () => {
    const one = await ran('math-random-seeded.js', { randomSeed: 7 })
    const two = await ran('math-random-seeded.js', { randomSeed: 7 })
    expect(one.trace).toEqual(two.trace)
    expect(one.trace.header.randomSeed).toBe(7)
    expect(one.observableOutput).toEqual([{ kind: 'console', level: 'log', text: 'true' }])
  },
  'raf-microtask-checkpoint.js': async () => {
    const { trace, observableOutput } = await ran('raf-microtask-checkpoint.js')
    expect(trace.header.unsupportedApis).toContain('requestAnimationFrame')
    expect(trace.events).toContainEqual(
      expect.objectContaining({ k: 'exception:report', unsupportedApi: 'requestAnimationFrame' }),
    )
    expect(observableOutput.some((o) => o.kind === 'console')).toBe(false)
  },
  'syntax-error-runs-nothing.js': async () => {
    const result = await runScript(source('syntax-error-runs-nothing.js'))
    expect(result).toMatchObject({ kind: 'syntax-error', line: 4 })
  },
  'unsupported-api-fetch.js': async () => {
    const { trace } = await ran('unsupported-api-fetch.js')
    expect(trace.header.unsupportedApis).toContain('fetch')
    expect(trace.events).toContainEqual(
      expect.objectContaining({ k: 'exception:report', origin: 'script', unsupportedApi: 'fetch' }),
    )
  },
}

const skippedFixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.golden.json'))
  .filter((f) => JSON.parse(readFileSync(fixturesDir + f, 'utf8')).status === 'skip')
  .map((f) => f.replace('.golden.json', '.js'))
  .sort()

describe('Skipped Fixtures keep a simulator-side expectation', () => {
  it('has an expectation for exactly the skipped Fixtures', () => {
    expect(Object.keys(expectations).sort()).toEqual(skippedFixtures)
  })

  for (const [name, expectation] of Object.entries(expectations)) {
    it(`${name}`, async () => {
      expect.hasAssertions()
      await expectation()
    })
  }
})
