import { describe, expect, it } from 'vitest'
import type { TraceEvent } from '../../../trace/trace-event'
import { findMatchedEvent, resolveDriveSteps } from '../resolve-drive-steps'
import type { DriveStep } from '../drive-step'

const base = { t: 0, ref: 'HTML:test' as const, visible: true }
const events: TraceEvent[] = [
  { ...base, seq: 0, k: 'run:start' },
  { ...base, seq: 1, k: 'console', level: 'log', text: 'start' },
  { ...base, seq: 2, k: 'job:begin', jobId: 'j1', visible: false },
  { ...base, seq: 3, k: 'job:begin', jobId: 'j1' },
  { ...base, seq: 4, k: 'console', level: 'log', text: 'end' },
  { ...base, seq: 5, k: 'job:begin', jobId: 'j2' },
]

const step = (at: DriveStep['at']): DriveStep => ({ at, target: 'console', title: 't', body: 'b' })

describe('findMatchedEvent', () => {
  it('finds a console event by its printed text', () => {
    expect(findMatchedEvent(events, { k: 'console', text: 'end' })).toBe(4)
  })

  it('matches fields with where, and counts from after', () => {
    const framed: TraceEvent[] = [
      ...events,
      { ...base, seq: 6, k: 'frame:push', frameId: 'f1', label: 'step', builtin: false },
      { ...base, seq: 7, k: 'job:begin', jobId: 'j3' },
      { ...base, seq: 8, k: 'frame:push', frameId: 'f2', label: 'step', builtin: false },
    ]
    expect(findMatchedEvent(framed, { k: 'frame:push', where: { label: 'step' } })).toBe(6)
    expect(findMatchedEvent(framed, { k: 'frame:push', where: { label: 'nope' } })).toBeNull()
    expect(findMatchedEvent(framed, { k: 'frame:push', after: { k: 'job:begin', nth: 3 } })).toBe(8)
    expect(findMatchedEvent(framed, { k: 'frame:push', after: { k: 'job:begin', nth: 9 } })).toBeNull()
  })

  it('counts only visible events and honours nth', () => {
    expect(findMatchedEvent(events, { k: 'job:begin' })).toBe(3)
    expect(findMatchedEvent(events, { k: 'job:begin', nth: 2 })).toBe(5)
    expect(findMatchedEvent(events, { k: 'job:begin', nth: 3 })).toBeNull()
  })
})

describe('resolveDriveSteps', () => {
  it('places resolvable steps and reports the rest, keeping order', () => {
    const missing = step({ k: 'console', text: 'nope' })
    const { steps, unresolved } = resolveDriveSteps(
      [step({ k: 'console', text: 'start' }), missing, step({ k: 'job:begin', nth: 2 })],
      events,
    )
    expect(steps.map((s) => s.position)).toEqual([1, 5])
    expect(steps[0]).not.toHaveProperty('at')
    expect(unresolved).toEqual([missing])
  })
})
