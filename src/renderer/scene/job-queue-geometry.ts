import { REGIONS } from './scene-world'
import { layoutOf, trayBackSvg, trayFrontSvg } from './queue-tray-geometry'

/**
 * Microtask queue: the tray next to the call stack. Jobs wait in it head first; the Job
 * that begins slides onto the run pad at the stack end, where its callback's frames go on.
 */
export const JOB_TRAY = layoutOf(REGIONS.jobQueue)
export const jobTrayBackSvg = trayBackSvg(JOB_TRAY, 'microtask queue')
export const jobTrayFrontSvg = trayFrontSvg(JOB_TRAY)
