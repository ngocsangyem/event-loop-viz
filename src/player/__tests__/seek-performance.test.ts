import { describe, expect, it } from 'vitest'
import { createPlayer } from '../player'
import { applyEvent } from '../apply-event'
import { createInitialState } from '../replay-state'
import { buildTrace } from './hand-built-traces'
import type { Trace } from '../../trace/trace-event'

const EVENT_BUDGET = 200_000

/**
 * A Trace at the events Budget whose events keep growing the folded state (promises,
 * console output, queued Jobs), which is what makes seeking in long Runs expensive.
 */
function longTrace(consoleEvery: number): Trace {
  const specs: Parameters<typeof buildTrace>[0] = [{ k: 'run:start' }]
  for (let n = 0; specs.length < EVENT_BUDGET; n++) {
    const pid = `p${n}`
    specs.push({ k: 'promise:create', pid })
    specs.push({ k: 'promise:settle', pid, state: 'fulfilled' })
    specs.push({ k: 'job:enqueue', jobId: `job-${n}`, jobKind: 'reaction', pid })
    specs.push({ k: 'job:begin', jobId: `job-${n}` })
    specs.push({ k: 'frame:push', frameId: `f${n}`, label: 'cb', builtin: false })
    if (n % consoleEvery === 0) specs.push({ k: 'console', level: 'log', text: `line ${n}` })
    specs.push({ k: 'frame:pop', frameId: `f${n}`, label: 'cb', builtin: false })
    specs.push({ k: 'job:end', jobId: `job-${n}` })
  }
  return buildTrace(specs.slice(0, EVENT_BUDGET))
}

/** Deterministic position sequence, so the test never depends on Math.random. */
function* positions(count: number, max: number) {
  let x = 12345
  for (let i = 0; i < count; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0
    yield x % (max + 1)
  }
}

function p95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!
}

describe('seeking in a Trace at the events Budget', () => {
  it.each([
    ['a typical Trace', 8],
    ['a console-heavy Trace', 1],
  ])('random seek on %s takes at most 50 ms at p95', (name, consoleEvery) => {
    const trace = longTrace(consoleEvery)
    expect(trace.events).toHaveLength(EVENT_BUDGET)
    const t0 = performance.now()
    const player = createPlayer(trace)
    // Building the Player must not stall the UI when a Run arrives (generous bound for CI).
    expect(performance.now() - t0).toBeLessThan(3000)

    // Warm-up lets the JIT settle so CI noise does not decide the result.
    for (const position of positions(50, EVENT_BUDGET - 1)) player.stateAt(position)

    const samples: number[] = []
    for (const position of positions(400, EVENT_BUDGET - 1)) {
      const start = performance.now()
      player.stateAt(position)
      samples.push(performance.now() - start)
    }
    const measured = p95(samples)
    console.info(`seek p95 (${name}): ${measured.toFixed(2)} ms`)
    expect(measured).toBeLessThanOrEqual(50)
  }, 120_000)

  it('seeks agree with folding the Trace from the start', () => {
    const trace = longTrace(8)
    const player = createPlayer(trace)
    const eventAt = (seq: number) => trace.events[seq]
    const folded = createInitialState()
    const checks = new Set([0, 1, 499, 500, 501, 1000, 99_999, 100_000, 150_001, EVENT_BUDGET - 1])
    trace.events.forEach((event, i) => {
      applyEvent(folded, event, eventAt)
      if (checks.has(i)) expect(player.stateAt(i)).toEqual(folded)
    })
  }, 60_000)
})
