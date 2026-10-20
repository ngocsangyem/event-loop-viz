import type { Component } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import CallStackPart from './call-stack-part.vue'
import { callStackOf } from './call-stack-model'
import ConsolePart from './console-part.vue'
import { consoleScreenOf } from './console-screen-model'

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
    id: 'console',
    component: ConsolePart,
    readout(state) {
      const { printed } = consoleScreenOf(state, { rows: 0, columns: 0 })
      return printed === 0 ? null : `console ${printed}`
    },
  },
]
