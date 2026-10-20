import { describe, expect, it } from 'vitest'
import { createPlayer } from '../player'
import { buildTrace, loc, timerAndJobTrace } from './hand-built-traces'

describe('what the running Job and Task were', () => {
  const player = createPlayer(timerAndJobTrace())

  it('remembers the kind of the Job that is running after it leaves the queue', () => {
    expect(player.stateAt(14).currentJobKind).toBe('reaction')
    expect(player.stateAt(19).currentJobKind).toBe('microtask')
    expect(player.stateAt(18).currentJobKind).toBeNull()
  })

  it('remembers the source of the Task that is running after it leaves the queue', () => {
    expect(player.stateAt(2).currentTaskSource).toBe('script')
    expect(player.stateAt(22).currentTaskSource).toBe('timer')
    expect(player.stateAt(25).currentTaskSource).toBeNull()
  })
})

describe('stateAt on a hand-built Trace', () => {
  const player = createPlayer(timerAndJobTrace())

  it('shows an empty world at the first event', () => {
    const s = player.stateAt(0)
    expect(s.position).toBe(0)
    expect(s.stack).toEqual([])
    expect(s.tasks).toEqual([])
    expect(s.jobs).toEqual([])
    expect(s.timers).toEqual([])
    expect(s.console).toEqual([])
    expect(s.clockUs).toBe(0)
    expect(s.sourceRange).toBeNull()
    expect(s.suspendedAwaits).toEqual([])
  })

  it('tracks the call stack, queues, timers, clock and console mid-Script', () => {
    const s = player.stateAt(10)
    expect(s.currentTask).toBe('task-1')
    expect(s.stack).toEqual([{ frameId: 'f1', label: '(script)', builtin: false }])
    expect(s.tasks).toEqual([{ taskId: 'task-2', source: 'timer', dueUs: 10005 }])
    expect(s.jobs).toEqual([{ jobId: 'job-1', jobKind: 'reaction', pid: 'p1', outcome: 'fulfill' }])
    expect(s.timers).toEqual([
      { tid: '1', requestedMs: 10, clampedMs: 10, repeat: false, dueUs: 10005 },
    ])
    expect(s.clockUs).toBe(5)
    expect(s.console).toEqual([{ kind: 'console', level: 'log', text: 'sync' }])
    expect(s.promises).toEqual({ p1: 'fulfilled' })
    expect(s.sourceRange).toEqual(loc(7))
  })

  it('points the cause range at the scheduling event and numbers Ticks', () => {
    const s = player.stateAt(14)
    expect(s.currentJob).toBe('job-1')
    expect(s.inCheckpoint).toBe(true)
    expect(s.tick).toBe(1)
    expect(s.causeRange).toBeNull() // the enqueuing event carried no source location
    const later = player.stateAt(19)
    expect(later.tick).toBe(2)
    expect(later.causeRange).toEqual(loc(20))
  })

  it('clears the current Job and Task, and consumes the timer, when they finish', () => {
    const s = player.stateAt(25)
    expect(s.currentTask).toBeNull()
    expect(s.currentJob).toBeNull()
    expect(s.inCheckpoint).toBe(false)
    expect(s.jobs).toEqual([])
    expect(s.tasks).toEqual([])
    expect(s.timers).toEqual([])
    expect(s.clockUs).toBe(10005)
    expect(s.console.map((e) => (e.kind === 'console' ? e.text : ''))).toEqual(['sync', 'timer'])
  })

  it('re-arms an interval under the same id and drops it on clear', () => {
    const p = createPlayer(
      buildTrace([
        { k: 'run:start' },
        { k: 'timer:init', tid: '1', requestedMs: 5, clampedMs: 5, nesting: 1, repeat: true, t: 0 },
        { k: 'timer:fire', tid: '1', t: 5000 },
        { k: 'timer:init', tid: '1', requestedMs: 5, clampedMs: 5, nesting: 2, repeat: true, t: 5000 },
        { k: 'timer:clear', tid: '1' },
      ]),
    )
    expect(p.stateAt(3).timers).toEqual([
      { tid: '1', requestedMs: 5, clampedMs: 5, repeat: true, dueUs: 10000 },
    ])
    expect(p.stateAt(4).timers).toEqual([])
  })

  it('ignores event kinds it does not know yet but still advances position and clock', () => {
    const trace = buildTrace([{ k: 'run:start' }, { k: 'run:start', t: 7 }])
    const future = { ...trace.events[1]!, seq: 1, k: 'await:suspend', pid: 'p9', t: 7 }
    const p = createPlayer({ ...trace, events: [trace.events[0]!, future as never] })
    const s = p.stateAt(1)
    expect(s.position).toBe(1)
    expect(s.clockUs).toBe(7)
    expect(s.stack).toEqual([])
  })

  it('records a halt', () => {
    const p = createPlayer(buildTrace([{ k: 'run:start' }, { k: 'run:halted', reason: 'nodes', limit: 9 }]))
    expect(p.stateAt(1).halted).toEqual({ reason: 'nodes', limit: 9 })
  })

  it('rejects out-of-range positions by clamping', () => {
    expect(player.stateAt(-3).position).toBe(0)
    expect(player.stateAt(999).position).toBe(25)
  })
})
