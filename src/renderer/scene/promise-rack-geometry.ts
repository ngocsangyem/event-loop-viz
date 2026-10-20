import * as k from './iso-kit'
import { P, REGIONS, at, dots, line, solid } from './scene-world'

/**
 * Promise rack: a base with a row of cradles. Each promise sits in a cradle (a flat tray
 * while pending, a raised block once settled, outlined green when it fulfilled and red when
 * it rejected). An async function parked at an await hangs a lit tag on the bracket beside
 * the cradle of the promise it waits on, and the tag leaves when the function resumes.
 * Two drums at the back stand for async generators: raised and lit while one runs.
 */
const region = REGIONS.promises
const BASE_H = 4

export const ROW_COUNT = 5
export const GENERATOR_COUNT = 2
const ROW_PITCH = 15
const ROW_Y0 = region.y + 36
const CELL: Pick<k.Plan, 'w' | 'd' | 'r'> = { w: 34, d: 10, r: 1.2 }
const TAG: Pick<k.Plan, 'w' | 'd' | 'r'> = { w: 28, d: 10, r: 1.2 }
const CELL_X = region.x + 4
const TAG_X = region.x + region.w - 4 - TAG.w

export const PENDING_H = 1.2
export const SETTLED_H = 5
export const TAG_H = 5.5
export const TAG_Z = BASE_H

export const cellPlan = (row: number): k.Plan => ({
  x: CELL_X,
  y: ROW_Y0 + row * ROW_PITCH,
  ...CELL,
})
export const tagPlan = (row: number): k.Plan => ({
  x: TAG_X,
  y: ROW_Y0 + row * ROW_PITCH,
  ...TAG,
})
const bracketPlan = (row: number): k.Plan => ({
  x: CELL_X + CELL.w - 1,
  y: ROW_Y0 + row * ROW_PITCH + 3.5,
  w: TAG_X - CELL_X - CELL.w + 2,
  d: 3,
  r: 0.6,
})

export const cellShape = (row: number, height: number) =>
  k.slabOf(cellPlan(row), BASE_H, height, P, 4, 0.4)
export const tagShape = (row: number) => k.slabOf(tagPlan(row), TAG_Z, TAG_H, P, 4, 0.4)
export const bracketShape = (row: number) =>
  k.slabOf(bracketPlan(row), BASE_H, TAG_Z - BASE_H + 2, P, 2)

/** Outline drawn round a cradle's top face: the colour that says how the promise settled. */
export const cellRim = (row: number, height: number) =>
  k.planOutline(k.insetPlan(cellPlan(row), 0.5), BASE_H + height, P, 4)

/** Matrix for a line of text on a cradle or tag; `edge` places its anchor at the left or right. */
export const rowTextMatrix = (plan: k.Plan, height: number, z: number, edge: 'start' | 'end') =>
  k.topMatrix(
    [edge === 'start' ? plan.x + 2.6 : plan.x + plan.w - 2.6, plan.y + plan.d / 2 + 1.2],
    z + height,
    P,
    'x',
  )

export const cellTextMatrix = (row: number, height: number, edge: 'start' | 'end') =>
  rowTextMatrix(cellPlan(row), height, BASE_H, edge)
export const tagTextMatrix = (row: number) =>
  k.topMatrix([tagPlan(row).x + TAG.w / 2, tagPlan(row).y + TAG.d / 2 + 1.2], TAG_Z + TAG_H, P, 'x')

const DRUM = { r: 6.4, h: 8, lift: 4 }
const drumX = (slot: number) => region.x + 4 + 18.5 + slot * 37
const DRUM_Y = region.y + 19
export const drumShape = (slot: number, raised: boolean) =>
  k.cylinder(drumX(slot), DRUM_Y, DRUM.r, BASE_H + (raised ? DRUM.lift : 0), DRUM.h, P, 24, 0.5)
/** Ring on a drum's top face, so the cap reads as a turned part. */
export const drumCap = (slot: number, raised: boolean) =>
  k.planOutline(
    { x: drumX(slot) - 3.6, y: DRUM_Y - 3.6, w: 7.2, d: 7.2, r: 3.6 },
    BASE_H + (raised ? DRUM.lift : 0) + DRUM.h,
    P,
    12,
  )
export const drumLabelMatrix = (slot: number) =>
  k.topMatrix([drumX(slot), region.y + 31], BASE_H, P, 'x')

export const moreMatrix = k.topMatrix(
  [region.x + region.w - 6, region.y + region.d - 2.6],
  BASE_H,
  P,
  'x',
)

/** Base, engraved cradle outlines, drum sockets and the name: everything under the moving parts. */
function backSvg(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(region, 0, BASE_H, P)}"/>`]
  out.push(solid(k.slabOf(region, 0, BASE_H, P, 6, 0.8), { tone: 'lo' }))
  out.push(line(k.planOutline(k.insetPlan(region, 2.5), BASE_H, P, 6), { tone: 'faint' }))
  const slots = Array.from({ length: ROW_COUNT }, (_, row) => [
    k.planOutline(k.insetPlan(cellPlan(row), -1.2), BASE_H, P, 4),
    k.planOutline(k.insetPlan(tagPlan(row), -1.2), BASE_H, P, 4),
  ]).flat()
  out.push(line(slots.join(''), { tone: 'faint' }))
  const sockets = Array.from({ length: GENERATOR_COUNT }, (_, slot) =>
    k.planOutline(
      {
        x: drumX(slot) - DRUM.r - 1.5,
        y: DRUM_Y - DRUM.r - 1.5,
        w: 2 * (DRUM.r + 1.5),
        d: 2 * (DRUM.r + 1.5),
        r: DRUM.r + 1.5,
      },
      BASE_H,
      P,
      16,
    ),
  )
  out.push(line(sockets.join(''), { tone: 'lo' }))
  out.push(
    dots(
      k.corners(region, 5).map(([x, y]) => at([x, y, BASE_H])),
      { size: 0.5 },
    ),
  )
  const name = k.topMatrix([region.x + 6, region.y + 8.4], BASE_H, P, 'x')
  out.push(
    `<g class="iso-face-text" data-tone="lo" transform="${name}" font-size="3.8">` +
      `<text x="0" y="0">promises</text></g>`,
  )
  return out.join('')
}

export const promiseRackBackSvg = backSvg()
