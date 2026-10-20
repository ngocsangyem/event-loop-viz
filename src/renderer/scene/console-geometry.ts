import * as k from './iso-kit'
import { P, REGIONS, at, dots, frontFace, line, solid } from './scene-world'

/**
 * Console machine: a monitor on a weighted stand. The text is drawn in the vertical plane
 * of its front face (the face that looks toward the viewer), so it foreshortens with the
 * housing instead of floating over it.
 */
const region = REGIONS.console

const HOUSING_W = region.w - 20
const CENTRE_X = region.x + HOUSING_W / 2
const FOOT: k.Plan = { x: CENTRE_X - 34, y: region.y - 8, w: 68, d: 46, r: 7 }
const FOOT_H = 5
const NECK: k.Plan = { x: CENTRE_X - 10, y: region.y + 4, w: 20, d: 14, r: 2 }
const HOUSING: k.Plan = { x: region.x, y: region.y, w: HOUSING_W, d: 18, r: 3 }
const HOUSING_Z = 36
const HOUSING_H = 98
const HOUSING_TOP = HOUSING_Z + HOUSING_H
/** The plane of the housing's front face. */
export const FACE_Y = HOUSING.y + HOUSING.d

/** Screen window on the front face, in face coordinates (x along the plate, z up). */
export const SCREEN = {
  x0: HOUSING.x + 12,
  x1: HOUSING.x + HOUSING.w - 12,
  z0: HOUSING_Z + 16,
  z1: HOUSING_TOP - 10,
}
export const SCREEN_ROWS = 7
export const SCREEN_COLUMNS = 27
export const ROW_HEIGHT = (SCREEN.z1 - SCREEN.z0 - 10) / SCREEN_ROWS
export const FONT_SIZE = Math.min(7.4, ROW_HEIGHT * 0.84)
export const TEXT_X = SCREEN.x0 + 6
export const rowBaseline = (row: number) => -(SCREEN.z1 - 7 - row * ROW_HEIGHT)

/** Rounded rectangle in face coordinates, as a flat path for the face plane. */
export const facePath = (x0: number, z0: number, x1: number, z1: number, r: number) =>
  k.pathOf(
    k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 5).map(([u, z]) => [u, -z]),
    true,
  )

export const SCREEN_PATH = facePath(SCREEN.x0, SCREEN.z0, SCREEN.x1, SCREEN.z1, 4)
export const FACE_MATRIX = frontFace(FACE_Y)

function stand(): string {
  const out = [`<path class="iso-halo" d="${k.slabOf(FOOT, 0, FOOT_H, P).fill}"/>`]
  out.push(solid(k.slabOf(FOOT, 0, FOOT_H, P, 6, 0.8), { tone: 'lo' }))
  out.push(line(k.planOutline(k.insetPlan(FOOT, 4), FOOT_H, P, 6), { tone: 'faint' }))
  const screws = k.corners(FOOT, 6).map(([x, y]) => at([x, y, FOOT_H]))
  out.push(dots(screws, { size: 0.5 }))
  out.push(solid(k.slabOf(NECK, FOOT_H, HOUSING_Z - FOOT_H + 2, P, 4, 0.5), { tone: 'mid' }))
  out.push(line([14, 22, 30].map((z) => k.sideSeam(NECK, z, P, 4)).join(''), { tone: 'faint' }))
  return out.join('')
}

function housing(): string {
  const out = [solid(k.slabOf(HOUSING, HOUSING_Z, HOUSING_H, P, 6, 1.2), { tone: 'mid' })]
  // Vent slots across the top face; each ends inside the bevel, none runs off an edge.
  const slots: string[] = []
  for (let x = HOUSING.x + 20; x <= HOUSING.x + HOUSING.w - 20; x += 6) {
    slots.push(k.lineOnTop([x, HOUSING.y + 5], [x, HOUSING.y + HOUSING.d - 5], HOUSING_TOP, P))
  }
  out.push(line(slots.join(''), { tone: 'lo' }))
  out.push(line(k.planOutline(k.insetPlan(HOUSING, 2.2), HOUSING_TOP, P, 6), { tone: 'faint' }))
  return out.join('')
}

/** The bezel, status lamp, screws and engraved label on the front face. */
function bezel(): string {
  const { x0, x1, z0, z1 } = SCREEN
  const out: string[] = []
  out.push(
    `<path class="iso-line" data-tone="lo" d="${facePath(x0 - 4, z0 - 4, x1 + 4, z1 + 4, 6)}"/>`,
  )
  out.push(
    `<path class="iso-line" data-tone="faint" d="${facePath(x0 - 7, z0 - 7, x1 + 7, z1 + 7, 8)}"/>`,
  )
  const label = [x0, x0 + 26, x0 + 44].map((x, i) => {
    const widths = [18, 12, 16]
    return `M${x} ${-(HOUSING_Z + 6)}h${widths[i]}`
  })
  out.push(`<path class="iso-line" data-tone="lo" data-free d="${label.join('')}"/>`)
  const knobs = [x1 - 30, x1 - 18, x1 - 6].map(
    (x) => `<circle class="iso-line" data-tone="mid" cx="${x}" cy="${-(HOUSING_Z + 7)}" r="2.2"/>`,
  )
  out.push(...knobs)
  out.push(`<circle class="iso-dot-lit" cx="${x0 + 5}" cy="${-(HOUSING_Z + 7)}" r="1.1"/>`)
  const screws = [
    [x0 - 7, z0 - 7],
    [x1 + 7, z0 - 7],
    [x0 - 7, z1 + 7],
    [x1 + 7, z1 + 7],
  ]
  out.push(...screws.map(([x, z]) => `<circle class="iso-dot" cx="${x}" cy="${-z!}" r="0.7"/>`))
  return `<g transform="${FACE_MATRIX}">${out.join('')}</g>`
}

export const consoleBackSvg = [stand(), housing(), bezel()].join('')
