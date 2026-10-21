import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../player/replay-state'
import { createSameView } from '../use-panel-chip-travel'

describe('createSameView', () => {
  it('computes the signature of the position it compares from only once per run of hops', () => {
    const stateAt = vi.fn<(position: number) => ReturnType<typeof createInitialState>>(() => createInitialState())
    const sameView = createSameView({ stateAt })
    expect(sameView(3, 4)).toBe(true)
    expect(sameView(3, 5)).toBe(true)
    expect(sameView(3, 6)).toBe(true)
    // One call for `from` plus one per `to`.
    expect(stateAt.mock.calls.filter(([position]) => position === 3)).toHaveLength(1)
    expect(stateAt).toHaveBeenCalledTimes(4)
    sameView(4, 5)
    expect(stateAt.mock.calls.filter(([position]) => position === 4)).toHaveLength(2)
  })
})
