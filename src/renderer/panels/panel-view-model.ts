import type { ReplayState } from '../../player/replay-state'
import { callStackOf } from '../scene/call-stack-model'
import type { StackPlateModel } from '../scene/call-stack-model'
import { loopPhaseOf } from './event-loop-phase'

/**
 * The frames a learner recognises: their own functions and the built-in each one calls
 * directly (console.log, setTimeout, then...). Built-ins called by other built-ins (Promise
 * executors, species getters) are engine plumbing and stay hidden. Bottom to top.
 */
export function visibleFrames(state: ReplayState): StackPlateModel[] {
  const frames = callStackOf(state).frames
  return frames.filter((frame, i) => !(frame.builtin && frames[i - 1]?.builtin))
}

/**
 * Everything the panels draw for a state, as one comparable string. Two positions with the same
 * signature look identical in the panels, so autoplay can pass over the second one.
 */
export function panelSignature(state: ReplayState): string {
  return JSON.stringify([
    visibleFrames(state).map((frame) => frame.frameId),
    state.tasks.map((task) => task.taskId),
    state.currentTask,
    state.jobs.map((job) => job.jobId),
    state.currentJob,
    state.timers.map((timer) => timer.tid),
    state.webOps.map((op) => op.opId),
    state.console.length,
    loopPhaseOf(state),
    state.halted?.reason ?? null,
  ])
}
