import type { ReplayState } from '../../player/replay-state'

/** Which part of one event-loop iteration a ReplayState is in. */
export type LoopPhase = 'idle' | 'task' | 'microtasks' | 'halted'

export function loopPhaseOf(state: ReplayState): LoopPhase {
  if (state.halted) return 'halted'
  if (state.currentJob !== null || state.inCheckpoint) return 'microtasks'
  if (state.currentTask !== null || state.stack.length > 0) return 'task'
  return 'idle'
}

export const LOOP_PHASE_TEXT: Record<LoopPhase, string> = {
  idle: 'Waiting for the next Task',
  task: 'Running a Task',
  microtasks: 'Draining microtasks',
  halted: 'Run finished',
}
