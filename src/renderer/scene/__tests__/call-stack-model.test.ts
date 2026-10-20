import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import { callStackOf } from '../call-stack-model'

const stateWith = (stack: ReplayState['stack']): ReplayState => ({
  ...createInitialState(),
  stack,
})

describe('callStackOf', () => {
  it('has no frames and no top when the stack is empty', () => {
    expect(callStackOf(createInitialState())).toEqual({ frames: [], topLabel: null })
  })

  it('lists frames bottom to top and flags only the newest as the top', () => {
    const model = callStackOf(
      stateWith([
        { frameId: 'f1', label: '(script)', builtin: false },
        { frameId: 'f2', label: 'log', builtin: true },
      ]),
    )
    expect(model.frames).toEqual([
      { frameId: 'f1', label: '(script)', builtin: false, isTop: false },
      { frameId: 'f2', label: 'log', builtin: true, isTop: true },
    ])
    expect(model.topLabel).toBe('log')
  })

  it('does not alias the replay state it read', () => {
    const state = stateWith([{ frameId: 'f1', label: 'a', builtin: false }])
    const model = callStackOf(state)
    state.stack.push({ frameId: 'f2', label: 'b', builtin: false })
    expect(model.frames).toHaveLength(1)
  })
})
