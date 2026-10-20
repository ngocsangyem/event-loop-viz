import type { ReplayState } from '../../player/replay-state'

export interface StackPlateModel {
  frameId: string
  label: string
  builtin: boolean
  /** The newest frame: the code that is running now. */
  isTop: boolean
}

export interface CallStackModel {
  /** Bottom to top, in call order. */
  frames: StackPlateModel[]
  topLabel: string | null
}

/** What the call-stack part shows for one ReplayState: pure data, no geometry. */
export function callStackOf(state: ReplayState): CallStackModel {
  const last = state.stack.length - 1
  const frames = state.stack.map((frame, index): StackPlateModel => ({
    frameId: frame.frameId,
    label: frame.label,
    builtin: frame.builtin,
    isTop: index === last,
  }))
  return { frames, topLabel: frames[last]?.label ?? null }
}
