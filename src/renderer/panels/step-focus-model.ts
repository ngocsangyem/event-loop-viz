import type { ReplayState } from '../../player/replay-state'
import { loopPhaseOf } from './event-loop-phase'
import type { PanelConcept } from './panel-card.vue'
import { visibleFrames } from './panel-view-model'

/**
 * What one step changed, so the panes can show a single focal point (DESIGN.md · Focal
 * hierarchy): the panes whose content differs from the step before, and the queue entries
 * that were not there a step ago. `previous` is null when there is nothing to compare with.
 */
export interface StepFocus {
  changed: ReadonlySet<PanelConcept>
  newIds: ReadonlySet<string>
}

export const NO_FOCUS: StepFocus = { changed: new Set(), newIds: new Set() }

const join = (ids: readonly string[]) => ids.join('\u0000')

/** The ids each pane shows; built-in frames the Call Stack hides do not count as a change. */
function lanesOf(state: ReplayState) {
  return {
    stack: visibleFrames(state).map((f) => f.frameId),
    job: state.jobs.map((j) => j.jobId),
    task: state.tasks.map((t) => t.taskId),
    webapi: [...state.timers.map((t) => `${t.tid}@${t.dueUs}`), ...state.webOps.map((o) => o.opId)],
  }
}

export function stepFocusOf(previous: ReplayState | null, current: ReplayState): StepFocus {
  if (!previous) return NO_FOCUS
  const before = lanesOf(previous)
  const after = lanesOf(current)
  const changed = new Set<PanelConcept>()
  if (join(before.stack) !== join(after.stack)) changed.add('stack')
  if (join(before.job) !== join(after.job) || previous.currentJob !== current.currentJob) changed.add('job')
  if (join(before.task) !== join(after.task) || previous.currentTask !== current.currentTask) changed.add('task')
  if (join(before.webapi) !== join(after.webapi)) changed.add('webapi')
  if (previous.console.length !== current.console.length) changed.add('console')
  if (loopPhaseOf(previous) !== loopPhaseOf(current) || previous.tick !== current.tick) changed.add('loop')

  const newIds = new Set<string>()
  const lanes = [
    [before.stack, after.stack],
    [before.job, after.job],
    [before.task, after.task],
    [previous.timers.map((t) => t.tid), current.timers.map((t) => t.tid)],
    [previous.webOps.map((o) => o.taskId ?? o.opId), current.webOps.map((o) => o.taskId ?? o.opId)],
  ] as const
  for (const [was, is] of lanes) {
    const known = new Set(was)
    for (const id of is) if (!known.has(id)) newIds.add(id)
  }
  return { changed, newIds }
}
