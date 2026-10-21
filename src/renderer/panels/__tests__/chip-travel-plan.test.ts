import { describe, expect, it } from 'vitest'
import type { ChipPlace } from '../callback-chip-model'
import { diffChipPlaces, MAX_TRAVELLERS, travelDurationMs } from '../chip-travel-plan'

const chips = (entries: Record<string, ChipPlace>) =>
  new Map(Object.entries(entries).map(([id, place]) => [id, { place }]))

describe('diffChipPlaces', () => {
  it('reports chips that changed container', () => {
    const plan = diffChipPlaces(chips({ a: 'webapis', b: 'taskq' }), chips({ a: 'taskq', b: 'stack' }))
    expect(plan.moved).toEqual(['a', 'b'])
    expect(plan.entered).toEqual([])
  })

  it('ignores chips that stay put and chips that only gain their running mark', () => {
    const plan = diffChipPlaces(
      chips({ a: 'taskq', b: 'microq', c: 'webapis' }),
      chips({ a: 'taskq-running', b: 'microq-running', c: 'webapis' }),
    )
    expect(plan).toEqual({ moved: [], entered: [], tooMany: false })
  })

  it('treats a running row handing over to the stack as a move', () => {
    expect(diffChipPlaces(chips({ a: 'taskq-running' }), chips({ a: 'stack' })).moved).toEqual(['a'])
  })

  it('lets new chips leave the editor only where the code can schedule', () => {
    const plan = diffChipPlaces(
      chips({}),
      chips({ w: 'webapis', t: 'taskq', m: 'microq', s: 'stack', r: 'taskq-running' }),
    )
    expect(plan.entered).toEqual(['w', 't', 'm'])
  })

  it('ignores chips that disappeared', () => {
    expect(diffChipPlaces(chips({ a: 'stack' }), chips({}))).toEqual({ moved: [], entered: [], tooMany: false })
  })

  it('flags more travellers than the cap', () => {
    const next = Object.fromEntries(Array.from({ length: MAX_TRAVELLERS + 1 }, (_, i) => [`m${i}`, 'microq' as ChipPlace]))
    expect(diffChipPlaces(chips({}), chips(next)).tooMany).toBe(true)
    const atCap = Object.fromEntries(Array.from({ length: MAX_TRAVELLERS }, (_, i) => [`m${i}`, 'microq' as ChipPlace]))
    expect(diffChipPlaces(chips({}), chips(atCap)).tooMany).toBe(false)
  })
})

describe('travelDurationMs', () => {
  it('is the calm default for a manual step', () => {
    expect(travelDurationMs(false, 125)).toBe(450)
  })

  it('fits the playback step within 160-450 ms', () => {
    expect(travelDurationMs(true, 125)).toBe(160)
    expect(travelDurationMs(true, 500)).toBeCloseTo(425)
    expect(travelDurationMs(true, 4000)).toBe(450)
  })
})
