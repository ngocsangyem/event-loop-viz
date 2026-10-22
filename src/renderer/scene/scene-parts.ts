import type { Component } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import CallStackPart from './call-stack-part.vue'
import { callStackOf } from './call-stack-model'
import ConsolePart from './console-part.vue'
import { consoleScreenOf } from './console-screen-model'
import JobQueuePart from './job-queue-part.vue'
import PromiseRackPart from './promise-rack-part.vue'
import { promiseRackOf } from './promise-rack-model'
import { ROW_COUNT } from './promise-rack-geometry'
import TaskQueuePart from './task-queue-part.vue'
import TimerShelfPart from './timer-shelf-part.vue'

/**
 * One region of the machine. A part is a component with props `{ state, previous }` that
 * draws only its own region of the shared world (scene-world.ts), plus a one-line readout
 * for the card. To add a region: build its model, geometry and component beside these,
 * then add one entry here. The scene root never changes.
 */
export interface ScenePart {
  id: string
  component: Component
  /** Short text for the card's readout, or null when this part has nothing to report. */
  readout(state: ReplayState): string | null
}

/**
 * Painter's order: far to near, by the depth of each region's footprint centre
 * (`depthOf` in iso-kit.ts). A part nearer the viewer is drawn after the parts behind it.
 */
export const SCENE_PARTS: readonly ScenePart[] = [
  {
    id: 'call-stack',
    component: CallStackPart,
    readout(state) {
      const { frames, topLabel } = callStackOf(state)
      return frames.length === 0 ? 'stack empty' : `stack ${frames.length} · ${topLabel}`
    },
  },
  {
    id: 'timers',
    component: TimerShelfPart,
    readout(state) {
      const pending = state.timers.length + state.webOps.length
      return pending === 0 ? null : state.webOps.length === 0 ? `timers ${pending}` : `web apis ${pending}`
    },
  },
  {
    id: 'console',
    component: ConsolePart,
    readout(state) {
      const { printed } = consoleScreenOf(state, { rows: 0, columns: 0 })
      return printed === 0 ? null : `console ${printed}`
    },
  },
  {
    id: 'microtask-queue',
    component: JobQueuePart,
    readout: (state) => (state.jobs.length === 0 ? null : `jobs ${state.jobs.length}`),
  },
  {
    id: 'task-queue',
    component: TaskQueuePart,
    readout: (state) => (state.tasks.length === 0 ? null : `tasks ${state.tasks.length}`),
  },
  {
    id: 'promises',
    component: PromiseRackPart,
    readout(state) {
      const { rows, hiddenPromises } = promiseRackOf(state, { rows: ROW_COUNT, generators: 0 })
      const parked = state.suspendedAwaits.length
      if (rows.length + hiddenPromises === 0) return null
      return parked === 0
        ? `promises ${rows.length + hiddenPromises}`
        : `promises ${rows.length + hiddenPromises} · ${parked} awaiting`
    },
  },
]
