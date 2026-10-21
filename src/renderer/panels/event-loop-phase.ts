import type { ReplayState } from '../../player/replay-state'

/** Which part of one event-loop iteration a ReplayState is in. */
export type LoopPhase = 'idle' | 'task' | 'microtasks' | 'halted'

export function loopPhaseOf(state: ReplayState): LoopPhase {
  if (state.halted) return 'halted'
  if (state.currentJob !== null || state.inCheckpoint) return 'microtasks'
  if (state.currentTask !== null || state.stack.length > 0) return 'task'
  return 'idle'
}

/** Message key of the sentence that names each phase. */
export const LOOP_PHASE_KEY: Record<LoopPhase, string> = {
  idle: 'panels.eventLoop.idle',
  task: 'panels.eventLoop.running',
  microtasks: 'panels.eventLoop.draining',
  halted: 'panels.eventLoop.halted',
}
