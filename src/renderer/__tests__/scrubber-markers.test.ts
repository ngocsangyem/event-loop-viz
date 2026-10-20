// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createPlayer } from '../../player/player'
import { buildTrace } from '../../player/__tests__/hand-built-traces'
import { buildScrubberMarkers } from '../scrubber-markers'

describe('scrubber markers', () => {
  const trace = buildTrace([
    { k: 'run:start' },
    { k: 'task:begin', taskId: 't1' },
    { k: 'console', level: 'log', text: 'a' },
    { k: 'promise:create', pid: 'p1', visible: false },
    { k: 'job:begin', jobId: 'j1' },
    { k: 'job:end', jobId: 'j1' },
    { k: 'timer:fire', tid: 'timer-1' },
    { k: 'rejection:notify', pid: 'p1', outcome: 'handled', message: '' },
    { k: 'rejection:notify', pid: 'p2', outcome: 'unhandled', message: 'boom' },
    { k: 'run:halted', reason: 'nodes', limit: 1 },
  ])
  const player = createPlayer(trace)
  const markers = buildScrubberMarkers(player, trace.events)

  it('marks each event family at its position', () => {
    expect(markers.map((m) => [m.seq, m.family])).toEqual([
      [1, 'task'],
      [2, 'console'],
      [4, 'job'],
      [6, 'timer'],
      [8, 'error'],
      [9, 'error'],
    ])
  })

  it('indexes markers by step so the slider value lands on them', () => {
    const steps = player.stepPositions()
    for (const m of markers) expect(steps[m.index]).toBe(m.seq)
  })
})
