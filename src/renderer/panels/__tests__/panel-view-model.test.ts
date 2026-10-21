import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState, StackFrame } from '../../../player/replay-state'
import { panelSignature, visibleFrames } from '../panel-view-model'

const frame = (frameId: string, label: string, builtin: boolean): StackFrame => ({ frameId, label, builtin })
const withStack = (stack: StackFrame[]): ReplayState => ({ ...createInitialState(), stack })

describe('visibleFrames', () => {
  it('keeps user frames and the built-in each one calls, hides built-ins called by built-ins', () => {
    const state = withStack([
      frame('f1', 'script', false),
      frame('f2', 'resolve', true),
      frame('f3', 'Promise', true),
      frame('f4', 'executorClosure', true),
    ])
    expect(visibleFrames(state).map((f) => f.label)).toEqual(['script', 'resolve'])
  })

  it('shows a built-in again once user code runs above it', () => {
    const state = withStack([
      frame('f1', 'script', false),
      frame('f2', 'then', true),
      frame('f3', 'cb', false),
      frame('f4', 'log', true),
    ])
    expect(visibleFrames(state).map((f) => f.label)).toEqual(['script', 'then', 'cb', 'log'])
  })
})

describe('panelSignature', () => {
  it('ignores hidden built-in frames but sees queue and console changes', () => {
    const base = withStack([frame('f1', 'script', false), frame('f2', 'resolve', true)])
    const deeper = withStack([...base.stack, frame('f3', 'Promise', true)])
    expect(panelSignature(deeper)).toBe(panelSignature(base))
    const logged: ReplayState = { ...base, console: [{ kind: 'console', level: 'log', text: 'x' } as never] }
    expect(panelSignature(logged)).not.toBe(panelSignature(base))
  })

  it('changes whenever a chip moves: queue, running row, stack frame, gone', () => {
    const callback = { kind: 'function' as const }
    const queued: ReplayState = { ...createInitialState(), jobs: [{ jobId: 'J1', jobKind: 'microtask', callback }] }
    const running: ReplayState = { ...createInitialState(), currentJob: 'J1', currentJobKind: 'microtask' }
    const onStack: ReplayState = {
      ...running,
      stack: [frame('f1', 'script', false), frame('f2', 'micro', false)],
    }
    const gone: ReplayState = { ...running, stack: [frame('f1', 'script', false)] }
    const sigs = [queued, running, onStack, gone].map(panelSignature)
    expect(new Set(sigs).size).toBe(4)
  })
})
