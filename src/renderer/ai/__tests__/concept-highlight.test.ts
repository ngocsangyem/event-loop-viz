import { describe, expect, it } from 'vitest'
import { highlightConcepts } from '../concept-highlight'
import { stepNumberAt } from '../step-number'

describe('highlightConcepts', () => {
  it('splits concept ids out of prose and keeps the text intact', () => {
    const segments = highlightConcepts('Task #1 ends, then Job #2 runs at the Checkpoint.')
    expect(segments.map((s) => s.text).join('')).toBe('Task #1 ends, then Job #2 runs at the Checkpoint.')
    expect(segments.filter((s) => s.hue).map((s) => [s.text, s.hue])).toEqual([
      ['Task #1', 'text-task'],
      ['Job #2', 'text-job'],
      ['Checkpoint', 'text-job'],
    ])
  })

  it('gives timers the Web APIs hue and leaves plain prose alone', () => {
    expect(highlightConcepts('Timer #3 fires')[0]).toEqual({ text: 'Timer #3', hue: 'text-webapi' })
    expect(highlightConcepts('nothing here')).toEqual([{ text: 'nothing here' }])
    expect(highlightConcepts('Tasks are not ids')).toEqual([{ text: 'Tasks are not ids' }])
  })
})

describe('stepNumberAt', () => {
  const events = [
    { seq: 0, visible: true },
    { seq: 1, visible: false },
    { seq: 2, visible: true },
    { seq: 3, visible: true },
  ] as unknown as Parameters<typeof stepNumberAt>[0]

  it('counts visible events up to and including the sequence number', () => {
    expect(stepNumberAt(events, 0)).toBe(1)
    expect(stepNumberAt(events, 1)).toBe(1)
    expect(stepNumberAt(events, 3)).toBe(3)
  })

  it('never goes below step 1', () => {
    expect(stepNumberAt([], 0)).toBe(1)
  })
})
