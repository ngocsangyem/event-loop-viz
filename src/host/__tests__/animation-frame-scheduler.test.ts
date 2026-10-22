// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { FRAME_PERIOD_US, FRAME_PHASE_US, createAnimationFrameScheduler, gridPointAfter } from '../animation-frame-scheduler'
import { createHostRunContext } from '../host-run-context'
import { DEFAULT_BUDGETS } from '../../trace/default-budgets'
import type { CallbackHandle } from '../engine-adapter'

const handle = (): CallbackHandle => ({ __callbackHandle: true })
const setup = () => {
  const ctx = createHostRunContext({ nodeCostUs: 1, randomSeed: 0, hostProfile: 'chrome-155', budgets: DEFAULT_BUDGETS })
  return { ctx, frames: createAnimationFrameScheduler(ctx) }
}

describe('frame grid', () => {
  it('starts at the phase and steps by 1/60 s, rounded to the microsecond', () => {
    expect(gridPointAfter(0)).toBe(FRAME_PHASE_US)
    expect(gridPointAfter(FRAME_PHASE_US)).toBe(Math.round(FRAME_PHASE_US + FRAME_PERIOD_US))
    expect(gridPointAfter(100_000)).toBe(104_000)
  })
})

describe('animation frame scheduler', () => {
  it('has no frame due while no callback waits', () => {
    const { frames } = setup()
    expect(frames.nextFrameDueUs(0)).toBeUndefined()
  })

  it('makes the first grid point due once a callback is requested', () => {
    const { frames } = setup()
    frames.request(handle())
    expect(frames.nextFrameDueUs(10)).toBe(FRAME_PHASE_US)
  })

  it('keeps a grid point missed while busy, so the frame is overdue', () => {
    const { frames } = setup()
    frames.request(handle())
    // The Script computed until 30 ms: the 4 ms opportunity is still the next one.
    expect(frames.nextFrameDueUs(30_000)).toBe(FRAME_PHASE_US)
  })

  it('consumes grid points passed while idle with nothing to run', () => {
    const { frames } = setup()
    frames.idleUntil(100_000)
    frames.request(handle())
    expect(frames.nextFrameDueUs(100_000)).toBe(104_000)
  })

  it('hands a frame the callbacks requested so far, with the grid timestamp', () => {
    const { frames } = setup()
    frames.request(handle())
    frames.request(handle())
    const frame = frames.takeFrame(FRAME_PHASE_US)
    expect(frame.callbacks.map((c) => c.rid)).toEqual([1, 2])
    expect(frame.frameMs).toBe(FRAME_PHASE_US / 1000)
    // A request made during the frame waits for the next grid point.
    frames.request(handle())
    expect(frames.nextFrameDueUs(FRAME_PHASE_US + 10)).toBe(gridPointAfter(FRAME_PHASE_US))
  })

  it('cancels a pending callback, or one queued later in the same frame', () => {
    const { frames, ctx } = setup()
    const a = frames.request(handle())
    const b = frames.request(handle())
    expect(frames.cancel(a)).toMatch(/^op-/)
    const frame = frames.takeFrame(FRAME_PHASE_US)
    expect(frame.callbacks.map((c) => c.rid)).toEqual([b])
    expect(frames.cancel(b)).toBeDefined()
    expect(frames.claim(frame.callbacks[0]!)).toBe(false)
    expect(frames.cancel(999)).toBeUndefined()
    expect(ctx.events.filter((e) => e.k === 'webapi:start')).toHaveLength(2)
  })
})
