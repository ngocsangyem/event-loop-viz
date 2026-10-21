import { describe, expect, it } from 'vitest'
import { isSingleStep } from '../chip-step-detection'

/** Positions 0..9; stepping moves by one. */
const line = {
  next: (p: number) => Math.min(p + 1, 9),
  prev: (p: number) => Math.max(p - 1, 0),
}

describe('isSingleStep', () => {
  it('is true for one step forward and one step back', () => {
    expect(isSingleStep(line, 3, 4)).toBe(true)
    expect(isSingleStep(line, 3, 2)).toBe(true)
  })

  it('is false when the playhead did not move', () => {
    expect(isSingleStep(line, 3, 3)).toBe(false)
  })

  it('is false for scrubber seeks, Task/Tick jumps and the ends', () => {
    expect(isSingleStep(line, 3, 7)).toBe(false)
    expect(isSingleStep(line, 7, 3)).toBe(false)
    expect(isSingleStep(line, 0, 9)).toBe(false)
  })

  it('counts a playback step that passes over identical views as one step', () => {
    const same = (from: number, to: number) => to <= 5 && from < to
    expect(isSingleStep(line, 3, 6, same)).toBe(true)
    // Landing before the first different view is not what playback does.
    expect(isSingleStep(line, 3, 5, same)).toBe(false)
  })

  it('does not treat a longer skip as a step when views differ', () => {
    expect(isSingleStep(line, 3, 6, () => false)).toBe(false)
  })

  it('stops at the Trace end instead of looping', () => {
    expect(isSingleStep(line, 8, 9, () => true)).toBe(true)
    expect(isSingleStep(line, 9, 5, () => true)).toBe(false)
  })
})
