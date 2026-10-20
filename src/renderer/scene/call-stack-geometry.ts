import * as k from './iso-kit'
import { P, REGIONS, at, dots, frontFace, line, solid } from './scene-world'

/**
 * Call stack machine: frames are flat plates that slide down a spindle, so push and pop are
 * literally putting a plate on and taking the top one off. A rear gauge board carries a
 * ruler with one division per plate at full pitch.
 */
const region = REGIONS.callStack
export const SPINDLE: [number, number] = [region.x + region.w / 2, region.y + region.d / 2]
export const PLATE_PLAN: k.Plan = {
  x: SPINDLE[0] - 36,
  y: SPINDLE[1] - 25,
  w: 72,
  d: 50,
  r: 4,
}
/** Ground of the first plate: on top of the spindle foot. */
export const STACK_Z0 = 8
export const POST_R = 4.2
export const POST_TOP = 200
/** Plates that fit at full pitch; deeper stacks compress their pitch. */
export const FULL_PITCH_PLATES = 16
export const FULL_PITCH = 10.5
const STACK_SPAN = FULL_PITCH_PLATES * FULL_PITCH
/** Vertical clearance between neighbouring plates so each one keeps its own seam. */
const GAP = 1.4

const BOARD: k.Plan = { x: SPINDLE[0] - 48, y: SPINDLE[1] - 40, w: 96, d: 6, r: 1.5 }
const BOARD_TOP = STACK_Z0 + STACK_SPAN + 10
const BOARD_FACE = BOARD.y + BOARD.d

export const pitchFor = (count: number) =>
  count <= FULL_PITCH_PLATES ? FULL_PITCH : STACK_SPAN / count

export const plateThickness = (pitch: number) => Math.max(1, pitch - GAP)
export const plateZ = (level: number, pitch: number) => STACK_Z0 + level * pitch
export const stackTopZ = (count: number) => plateZ(count, pitchFor(count)) - GAP

export const plateShape = (level: number, pitch: number) =>
  k.slabOf(PLATE_PLAN, plateZ(level, pitch), plateThickness(pitch), P, 5, Math.min(0.5, pitch / 10))

/** The post above the topmost plate; it is redrawn over the plates so they read as threaded. */
export const postAboveSvg = (count: number) => {
  const z = Math.max(STACK_Z0, stackTopZ(count))
  return solid(k.cylinder(SPINDLE[0], SPINDLE[1], POST_R, z, POST_TOP - z, P, 24), {
    tone: 'mid',
    crease: 'none',
  })
}

function foot(): string {
  const [x, y] = SPINDLE
  const out = [`<path class="iso-halo" d="${k.cylinder(x, y, 46, 0, 3, P, 40).fill}"/>`]
  out.push(solid(k.cylinder(x, y, 46, 0, 3, P, 44, 0.6), { tone: 'lo' }))
  out.push(solid(k.cylinder(x, y, 38, 3, STACK_Z0 - 3, P, 40, 0.5), { tone: 'mid' }))
  out.push(line(k.ring(x, y, 34, STACK_Z0, P, 40), { tone: 'lo' }))
  const bolts = [30, 150, 270, 330, 90, 210].map((deg) => {
    const a = (deg * Math.PI) / 180
    return [x + 42 * Math.cos(a), y + 42 * Math.sin(a)] as [number, number]
  })
  out.push(
    dots(
      bolts.map(([bx, by]) => at([bx, by, 3])),
      { size: 0.5 },
    ),
  )
  out.push(line(k.knurl(x, y, 38, 3, STACK_Z0, 56, P, 0.6), { tone: 'lo' }))
  return out.join('')
}

/** Rear gauge board with a ruler: tick `i` marks the top of the i-th plate at full pitch. */
function gaugeBoard(): string {
  const out = [solid(k.slabOf(BOARD, 4, BOARD_TOP - 4, P, 4, 0.6), { tone: 'mid' })]
  const left = BOARD.x
  const minor: string[] = []
  const major: string[] = []
  for (let i = 1; i <= FULL_PITCH_PLATES; i++) {
    const z = STACK_Z0 + i * FULL_PITCH - GAP
    const long = i % 4 === 0
    const length = long ? 9 : 4.5
    ;(long ? major : minor).push(
      k.segment([left, BOARD_FACE, z], [left + length, BOARD_FACE, z], P),
    )
  }
  out.push(line(minor.join(''), { tone: 'lo' }), line(major.join(''), { tone: 'mid' }))
  const numerals = [4, 8, 12, 16]
    .map((n) => {
      const z = STACK_Z0 + n * FULL_PITCH - GAP
      return `<text x="${BOARD.x + BOARD.w - 4}" y="${-(z - 1.2)}">${n}</text>`
    })
    .join('')
  out.push(
    `<g class="iso-face-text" data-tone="lo" transform="${frontFace(BOARD_FACE)}" font-size="4" text-anchor="end">${numerals}</g>`,
  )
  const screws = [BOARD.x + 6, BOARD.x + BOARD.w - 6].map((sx) =>
    at([sx, BOARD_FACE, BOARD_TOP - 6]),
  )
  out.push(dots(screws, { size: 0.5 }))
  out.push(
    dots(
      [BOARD.x + 6, BOARD.x + BOARD.w - 6].map((sx) => at([sx, BOARD_FACE, 12])),
      { size: 0.5 },
    ),
  )
  return out.join('')
}

function post(): string {
  const [x, y] = SPINDLE
  const out = [
    solid(k.cylinder(x, y, POST_R, STACK_Z0, POST_TOP - STACK_Z0, P, 24), {
      tone: 'mid',
      crease: 'none',
    }),
  ]
  out.push(line(k.sideArc(x, y, POST_R, POST_TOP - 10, P, 14), { tone: 'faint' }))
  return out.join('')
}

/** Everything that sits behind and under the plates. */
export const callStackBackSvg = [foot(), gaugeBoard(), post()].join('')

/** The spindle cap over the top of the stack: it keeps the plates on. */
export const callStackCapSvg = (() => {
  const [x, y] = SPINDLE
  const out = [solid(k.cylinder(x, y, 7.2, POST_TOP, 3, P, 32, 0.4), { tone: 'mid' })]
  out.push(solid(k.cylinder(x, y, 5.6, POST_TOP + 3, 4, P, 28, 0.4), { tone: 'hi' }))
  out.push(line(k.knurl(x, y, 5.6, POST_TOP + 3, POST_TOP + 7, 22, P, 0.3), { tone: 'lo' }))
  out.push(line(k.lineOnTop([x - 3.6, y], [x + 3.6, y], POST_TOP + 7, P), { tone: 'mid' }))
  return out.join('')
})()
