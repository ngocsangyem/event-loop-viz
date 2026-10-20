import { describe, expect, it } from 'vitest'
import { deriveObservableOutput } from '../../trace/derive-observable-output'
import type { Trace } from '../../trace/trace-event'
import { applyEvent } from '../apply-event'
import { createPlayer, SNAPSHOT_INTERVAL } from '../player'
import { createInitialState } from '../replay-state'
import asyncAwaitAndInterval from '../../../tests/golden/traces/async-await-and-interval.trace.json'
import haltedRun from '../../../tests/golden/traces/halted-run.trace.json'
import manyConsoleLines from '../../../tests/golden/traces/many-console-lines.trace.json'
import timersAndJobs from '../../../tests/golden/traces/timers-and-jobs.trace.json'
import unhandledRejection from '../../../tests/golden/traces/unhandled-rejection.trace.json'

// Golden Traces recorded from real Runs (engine262 host). Regenerate deliberately when the schema changes.
/** Reference: fold from event 0, with no snapshots involved. */
function foldFromZero(trace: Trace, position: number) {
  const state = createInitialState()
  for (let i = 0; i <= position; i++) applyEvent(state, trace.events[i]!, (s) => trace.events[s])
  return state
}

const GOLDEN: Record<string, Trace> = {
  'timers and jobs': timersAndJobs as Trace,
  'async await and interval': asyncAwaitAndInterval as Trace,
  'unhandled rejection': unhandledRejection as Trace,
  'many console lines': manyConsoleLines as Trace,
  'halted run': haltedRun as Trace,
}

describe.each(Object.entries(GOLDEN))('golden Trace: %s', (_name, trace) => {
  it('stateAt(i) equals a fold from 0 at every position', () => {
    const player = createPlayer(trace)
    for (let i = 0; i < trace.events.length; i++) {
      expect(player.stateAt(i)).toEqual(foldFromZero(trace, i))
    }
  })

  it('stepping back then forward returns a deep-equal state, and Bookkeeping Events are never steps', () => {
    const player = createPlayer(trace)
    for (const p of player.stepPositions()) {
      expect(trace.events[p]!.visible).toBe(true)
      if (p === player.first()) continue
      expect(player.stateAt(player.next(player.prev(p)))).toEqual(player.stateAt(p))
    }
    const hidden = trace.events.filter((e) => !e.visible).map((e) => e.seq)
    expect(player.stepPositions({ showAll: true })).toHaveLength(trace.events.length)
    for (const h of hidden) expect(player.stepPositions()).not.toContain(h)
  })

  it('the final state shows the Observable Output of the whole Trace', () => {
    const player = createPlayer(trace)
    expect(player.stateAt(trace.events.length - 1).console).toEqual(deriveObservableOutput(trace.events))
  })
})

describe('snapshots and halts', () => {
  it('exercises past the first snapshot interval', () => {
    const trace = manyConsoleLines as Trace
    expect(trace.events.length).toBeGreaterThan(SNAPSHOT_INTERVAL)
  })

  it('replays a halted Trace to its end', () => {
    const trace = haltedRun as Trace
    const player = createPlayer(trace)
    const end = player.stateAt(player.last())
    expect(end.halted?.reason).toBe('nodes')
    expect(end.position).toBe(trace.events.length - 1)
  })

  it('Task jumps land on task:begin events of a golden Trace', () => {
    const trace = timersAndJobs as Trace
    const player = createPlayer(trace)
    const begins = trace.events.filter((e) => e.k === 'task:begin').map((e) => e.seq)
    const visited: number[] = []
    for (let p = player.nextTask(0); !visited.includes(p); p = player.nextTask(p)) visited.push(p)
    expect(visited.slice(0, begins.length)).toEqual(begins)
  })
})
