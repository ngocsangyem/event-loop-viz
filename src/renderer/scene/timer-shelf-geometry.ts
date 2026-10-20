import * as k from './iso-kit'
import { P, REGIONS, at, dots, frontFace, line, solid } from './scene-world'

/**
 * Timers machine: a Virtual Clock display on a plinth at the back, and a shelf in front
 * of it with eight slots. A pending timer is a block standing in a slot, soonest due
 * first, marked with its id and the Virtual Clock time it becomes due; when it fires the
 * block leaves the shelf.
 */
const region = REGIONS.timers
const BASE_H = 4
const SHELF_H = 4
const SHELF_TOP = BASE_H + SHELF_H

export const SLOT_COLUMNS = 4
export const SLOT_ROWS = 2
export const SLOT_COUNT = SLOT_COLUMNS * SLOT_ROWS
export const BLOCK_H = 12
const COLUMN_PITCH = 26
const ROW_PITCH = 22

const SHELF: k.Plan = { x: region.x + 2, y: region.y + 30, w: region.w - 4, d: 50, r: 3 }
const SLOT_X0 = region.x + 4
const SLOT_Y0 = region.y + 34
const BLOCK = { w: 23, d: 16 }

/** Clock housing on its plinth, and the screen window in its front face. */
const PLINTH: k.Plan = { x: region.x + 14, y: region.y + 5, w: 82, d: 16, r: 2 }
const HOUSING: k.Plan = { x: region.x + 10, y: region.y + 4, w: 90, d: 14, r: 3 }
const HOUSING_Z = BASE_H + 14
const HOUSING_H = 30
const FACE_Y = HOUSING.y + HOUSING.d
export const CLOCK_SCREEN = {
  x0: HOUSING.x + 7,
  x1: HOUSING.x + HOUSING.w - 7,
  z0: HOUSING_Z + 8,
  z1: HOUSING_Z + HOUSING_H - 5,
}
export const CLOCK_MATRIX = frontFace(FACE_Y)
export const clockScreenPath = (() => {
  const { x0, x1, z0, z1 } = CLOCK_SCREEN
  return k.pathOf(
    k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r: 2.5 }, 4).map(([u, z]) => [u, -z]),
    true,
  )
})()
export const CLOCK_TEXT_X = (CLOCK_SCREEN.x0 + CLOCK_SCREEN.x1) / 2
export const CLOCK_TEXT_Y = -(CLOCK_SCREEN.z0 + 3.6)
export const CLOCK_FONT = 7.6

export const slotPlan = (slot: number): k.Plan => ({
  x: SLOT_X0 + Math.floor(slot / SLOT_ROWS) * COLUMN_PITCH,
  y: SLOT_Y0 + (slot % SLOT_ROWS) * ROW_PITCH,
  w: BLOCK.w,
  d: BLOCK.d,
  r: 1.5,
})

/** Slots far row first, then left to right, so nearer blocks are painted over farther ones. */
export const SLOT_PAINT_ORDER = Array.from({ length: SLOT_COUNT }, (_, slot) => slot).sort(
  (a, b) => (a % SLOT_ROWS) - (b % SLOT_ROWS) || a - b,
)

export const blockShape = (slot: number) => k.slabOf(slotPlan(slot), SHELF_TOP, BLOCK_H, P, 4, 0.5)

/** Matrix for a line of text lying on top of the block in `slot`; `row` 0 is the id line. */
export const blockTextMatrix = (slot: number, row: 0 | 1) => {
  const plan = slotPlan(slot)
  return k.topMatrix(
    [plan.x + plan.w / 2, plan.y + (row === 0 ? 5.6 : 12.6)],
    SHELF_TOP + BLOCK_H,
    P,
    'x',
  )
}
export const moreMatrix = k.topMatrix(
  [SHELF.x + SHELF.w - 6, SHELF.y + SHELF.d - 2.6],
  SHELF_TOP,
  P,
  'x',
)

function plinthAndClock(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(region, 0, BASE_H, P)}"/>`]
  out.push(solid(k.slabOf(region, 0, BASE_H, P, 6, 0.8), { tone: 'lo' }))
  out.push(line(k.planOutline(k.insetPlan(region, 2.5), BASE_H, P, 6), { tone: 'faint' }))
  out.push(solid(k.slabOf(PLINTH, BASE_H, HOUSING_Z - BASE_H + 1, P, 4, 0.4), { tone: 'mid' }))
  out.push(solid(k.slabOf(HOUSING, HOUSING_Z, HOUSING_H, P, 5, 1), { tone: 'mid' }))
  const slots: string[] = []
  for (let x = HOUSING.x + 16; x <= HOUSING.x + HOUSING.w - 16; x += 5) {
    slots.push(
      k.lineOnTop([x, HOUSING.y + 4], [x, HOUSING.y + HOUSING.d - 4], HOUSING_Z + HOUSING_H, P),
    )
  }
  out.push(line(slots.join(''), { tone: 'lo' }))
  // Bezel and engraved name on the front face.
  const { x0, x1, z0, z1 } = CLOCK_SCREEN
  const bezel = k.pathOf(
    k
      .roundedPlan({ x: x0 - 3, y: z0 - 3, w: x1 - x0 + 6, d: z1 - z0 + 6, r: 4 }, 4)
      .map(([u, z]) => [u, -z]),
    true,
  )
  const name = `<text x="${x0}" y="${-(HOUSING_Z + 3.4)}" font-size="3.4">virtual clock</text>`
  const lamp = `<circle class="iso-dot-lit" cx="${x1}" cy="${-(HOUSING_Z + 4.6)}" r="1"/>`
  out.push(
    `<g transform="${CLOCK_MATRIX}"><path class="iso-line" data-tone="lo" d="${bezel}"/>` +
      `<g class="iso-face-text" data-tone="lo">${name}</g>${lamp}</g>`,
  )
  out.push(
    dots(
      [HOUSING.x + 4, HOUSING.x + HOUSING.w - 4].map((x) =>
        at([x, FACE_Y, HOUSING_Z + HOUSING_H - 4]),
      ),
      { size: 0.5 },
    ),
  )
  return out.join('')
}

function shelf(): string {
  const out = [solid(k.slabOf(SHELF, BASE_H, SHELF_H, P, 6, 0.6), { tone: 'mid' })]
  const engraved = Array.from({ length: SLOT_COUNT }, (_, slot) =>
    k.planOutline(k.insetPlan(slotPlan(slot), -1.4), SHELF_TOP, P, 4),
  )
  out.push(line(engraved.join(''), { tone: 'faint' }))
  const ticks = k.topTicks(
    SHELF.x + 6,
    SHELF.x + SHELF.w - 6,
    5,
    5,
    SHELF.y + SHELF.d - 1.4,
    SHELF_TOP,
    [1.2, 2.2],
    P,
  )
  out.push(line(ticks.minor, { tone: 'lo' }), line(ticks.major, { tone: 'mid' }))
  out.push(
    dots(
      k.corners(SHELF, 4).map(([x, y]) => at([x, y, SHELF_TOP])),
      { size: 0.5 },
    ),
  )
  return out.join('')
}

/** Everything that sits behind and under the timer blocks. */
export const timerShelfBackSvg = [plinthAndClock(), shelf()].join('')
