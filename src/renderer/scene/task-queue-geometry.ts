import { REGIONS } from './scene-world'
import { layoutOf, trayBackSvg, trayFrontSvg } from './queue-tray-geometry'

/**
 * Task queue: a second tray, in the same lane. Tasks wait in it head first, each marked
 * with the source that queued it; the Task that begins sits on the run pad.
 */
export const TASK_TRAY = layoutOf(REGIONS.taskQueue)
export const taskTrayBackSvg = trayBackSvg(TASK_TRAY, 'task queue')
export const taskTrayFrontSvg = trayFrontSvg(TASK_TRAY)

/** Short enough to fit across a token; the full source name stays in `data-source`. */
const SOURCE_LABEL: Record<string, string> = {
  script: 'script',
  timer: 'timer',
  'port-message': 'port msg',
  'dom-manipulation': 'dom',
  'posted-message': 'post msg',
  networking: 'network',
  'javascript-engine': 'engine',
  'animation-frame': 'raf',
}
export const sourceLabel = (source: string) => SOURCE_LABEL[source] ?? source
