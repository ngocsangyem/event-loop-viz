import * as k from './iso-kit'
import type { Plan, Point3 } from './iso-kit'

/**
 * The Scene's shared world: one surface plate carrying every part of the event-loop
 * machine, and the one camera they are all drawn through. World units are about one pixel,
 * x and y lie on the plate, z is up. Every part module places itself with the plans below
 * instead of inventing coordinates, so parts added later cannot collide with these.
 *
 * Camera azimuth 56 shows the +y faces broad (the console screen lives on one) and the +x
 * faces narrow. Back to front is increasing depthOf(): a part nearer the viewer is drawn
 * after the parts behind it.
 */
export const WIDTH = 760
export const HEIGHT = 470

export const PLATE: Plan = { x: -220, y: -118, w: 440, d: 236, r: 12 }
export const PLATE_H = 14
export const FOOT_H = 6

/** Footprints of the machine's regions. Claimed regions are built; the rest stay empty lanes. */
export const REGIONS = {
  /** Spindle that frames slide onto. */
  callStack: { x: -210, y: -8, w: 116, d: 116, r: 8 } satisfies Plan,
  /** Monitor at the back right. */
  console: { x: 30, y: -108, w: 190, d: 80, r: 8 } satisfies Plan,
  /** Front lane for the queues (Job and Task queues) between the stack and the console. */
  queues: { x: -84, y: 44, w: 210, d: 52, r: 6 } satisfies Plan,
  /** Back centre lane for timers and the Virtual Clock. */
  timers: { x: -90, y: -108, w: 110, d: 80, r: 6 } satisfies Plan,
  /** Right front corner for promises, awaits and async generators. */
  promises: { x: 138, y: 44, w: 74, d: 52, r: 6 } satisfies Plan,
}

/** Tallest thing in the world (the spindle), used to fit the camera. */
export const SPINDLE_TOP = 212
export const MONITOR_TOP = 138

const fitPoints: Point3[] = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [
    REGIONS.callStack.x + REGIONS.callStack.w / 2,
    REGIONS.callStack.y + REGIONS.callStack.d / 2,
    SPINDLE_TOP,
  ],
  [REGIONS.console.x, REGIONS.console.y, MONITOR_TOP],
  [REGIONS.console.x + REGIONS.console.w, REGIONS.console.y, MONITOR_TOP],
]

export const P = k.fitProjection(fitPoints, WIDTH, HEIGHT, { pad: 26, azimuth: 56 })

export const at = (point: Point3) => k.iso(point, P)

export const solid = (paths: k.SolidPaths, style?: k.SolidStyle) => k.solidSvg(paths, style)
export const line = (d: string, style?: k.LineStyle) => k.lineSvg(d, style)
export const dots = (points: Array<k.Flat | Point3>, style?: Parameters<typeof k.dotsSvg>[1]) =>
  k.dotsSvg(points, style)

/** Plans sorted far to near, for repeated parts drawn in painter's order. */
export const byDepth = <T extends [number, number]>(points: T[]): T[] =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))

/**
 * A matrix that lays flat SVG (x along world x, y = -z) onto the vertical plane `y = faceY`,
 * the face that looks toward the viewer. Text and screens on that face are drawn in it.
 */
export const frontFace = (faceY: number) => k.sideMatrix([0, faceY], 0, P, 'left')
