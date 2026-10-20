import { describe, expect, it } from 'vitest'
import { createPlayer } from '../player'
import { buildTrace, timerAndJobTrace } from './hand-built-traces'

// timerAndJobTrace: seq 6 (promise:create) is the only Bookkeeping Event.
describe('stepping by Visible Event', () => {
  const player = createPlayer(timerAndJobTrace())

  it('never lands on a Bookkeeping Event, folding it into the next Visible Event', () => {
    expect(player.next(5)).toBe(7)
    expect(player.prev(7)).toBe(5)
    expect(player.stepPositions()).not.toContain(6)
    // The folded Bookkeeping Event's effect is already part of the next step's state.
    expect(player.stateAt(7).promises).toEqual({ p1: 'fulfilled' })
  })

  it('lands on Bookkeeping Events when show-all is on', () => {
    expect(player.next(5, { showAll: true })).toBe(6)
    expect(player.prev(7, { showAll: true })).toBe(6)
    expect(player.stepPositions({ showAll: true })).toHaveLength(26)
  })

  it('clamps at both ends', () => {
    expect(player.prev(0)).toBe(0)
    expect(player.next(25)).toBe(25)
    expect(player.first()).toBe(0)
    expect(player.last()).toBe(25)
  })

  it('seek snaps a Bookkeeping position forward to a step', () => {
    expect(player.seek(6)).toBe(7)
    expect(player.seek(6, { showAll: true })).toBe(6)
    expect(player.seek(500)).toBe(25)
  })

  it('stepping back then forward returns a deep-equal state', () => {
    for (const p of player.stepPositions().slice(1)) {
      const forward = player.next(player.prev(p))
      expect(forward).toBe(p)
      expect(player.stateAt(forward)).toEqual(player.stateAt(p))
    }
  })
})

describe('Tick and Task jumps', () => {
  const player = createPlayer(timerAndJobTrace())

  it('jumps between Task starts', () => {
    expect(player.nextTask(0)).toBe(2)
    expect(player.nextTask(2)).toBe(22)
    expect(player.nextTask(22)).toBe(25) // no later Task: clamp to the end
    expect(player.prevTask(25)).toBe(22)
    expect(player.prevTask(22)).toBe(2)
    expect(player.prevTask(2)).toBe(0)
  })

  it('jumps between Ticks of a Checkpoint', () => {
    // job-1 begins Tick 1 (seq 14), job-2 begins Tick 2 (seq 19)
    expect(player.nextTick(0)).toBe(14)
    expect(player.nextTick(14)).toBe(19)
    expect(player.nextTick(19)).toBe(25)
    expect(player.prevTick(25)).toBe(19)
    expect(player.prevTick(19)).toBe(14)
    expect(player.prevTick(14)).toBe(0)
  })

  it('treats Jobs of the same Tick as one Tick', () => {
    const p = createPlayer(
      buildTrace([
        { k: 'run:start' },
        { k: 'checkpoint:begin', reason: 'script-end' },
        { k: 'job:enqueue', jobId: 'a', jobKind: 'microtask' },
        { k: 'job:enqueue', jobId: 'b', jobKind: 'microtask' },
        { k: 'job:begin', jobId: 'a' }, // 4: Tick 1
        { k: 'job:end', jobId: 'a' },
        { k: 'job:begin', jobId: 'b' }, // 6: still Tick 1
        { k: 'job:end', jobId: 'b' },
        { k: 'checkpoint:end', reason: 'script-end' },
      ]),
    )
    expect(p.nextTick(0)).toBe(4)
    expect(p.nextTick(4)).toBe(8)
  })

  it('snaps an invisible boundary to the next step', () => {
    const p = createPlayer(
      buildTrace([
        { k: 'run:start' },
        { k: 'task:begin', taskId: 't', visible: false },
        { k: 'console', level: 'log', text: 'x' },
      ]),
    )
    expect(p.nextTask(0)).toBe(2)
    expect(p.nextTask(0, { showAll: true })).toBe(1)
  })
})
