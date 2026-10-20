import * as k from './iso-kit'
import { FOOT_H, P, PLATE, PLATE_H, REGIONS, at, byDepth, dots, line, solid } from './scene-world'

/**
 * The surface plate every part stands on: feet, bevelled slab, corner screws, a ruler strip
 * along the front edge, and a shallow engraved outline for each region so the empty lanes
 * read as places where something will sit. Static: built once at module load.
 */
function feet(): string {
  const out: string[] = []
  const spots = [...k.corners(PLATE, 24), [0, PLATE.y + 24], [0, PLATE.y + PLATE.d - 24]] as [
    number,
    number,
  ][]
  for (const [x, y] of byDepth(spots)) {
    out.push(solid(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: 'lo' }))
    out.push(
      solid(k.cylinder(x, y, 6.2, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: 'mid' }),
    )
  }
  return out.join('')
}

function slabAndScrews(): string {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`]
  out.push(solid(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.8), { tone: 'mid' }))
  out.push(line(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 12)
  out.push(line(screws.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(
    dots(
      screws.map(([x, y]) => at([x, y, 0])),
      { size: 0.55 },
    ),
  )
  return out.join('')
}

function laneEngravings(): string {
  const lanes = [REGIONS.promises]
  const out = lanes.map((lane) =>
    line(k.planOutline(k.insetPlan(lane, 0), 0, P), { tone: 'faint' }),
  )
  // Registration dots at each lane corner: the places later parts bolt down.
  const marks = lanes.flatMap((lane) => k.corners(lane, 5))
  out.push(
    dots(
      marks.map(([x, y]) => at([x, y, 0])),
      { size: 0.45, tone: 'lo' },
    ),
  )
  return out.join('')
}

function frontRuler(): string {
  const out: string[] = []
  const strip = { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 18, w: PLATE.w - 48, d: 8, r: 1.2 }
  out.push(solid(k.slabOf(strip, 0, 0.7, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(
    strip.x + 5,
    strip.x + strip.w - 5,
    5,
    5,
    strip.y + 0.9,
    0.7,
    [2.2, 4],
    P,
  )
  out.push(line(ticks.minor, { tone: 'lo' }), line(ticks.major, { tone: 'mid' }))
  const ends = [strip.x + 2.4, strip.x + strip.w - 2.4]
  out.push(
    dots(
      ends.map((x) => at([x, strip.y + strip.d / 2, 0.7])),
      { size: 0.5 },
    ),
  )
  return out.join('')
}

function labelPlate(): string {
  const plate = { x: PLATE.x + 26, y: PLATE.y + 14, w: 90, d: 16, r: 2 }
  const out = [solid(k.slabOf(plate, 0, 0.9, P, 3), { tone: 'lo', crease: 'none' })]
  const rules = [64, 44, 54].map((w, i) =>
    k.lineOnTop([plate.x + 6, plate.y + 4 + i * 4], [plate.x + 6 + w, plate.y + 4 + i * 4], 0.9, P),
  )
  out.push(line(rules.join(''), { tone: 'lo', free: true }))
  out.push(dots([at([plate.x + plate.w - 5, plate.y + plate.d / 2, 0.9])], { size: 0.5 }))
  return out.join('')
}

export const baseArtSvg = [
  feet(),
  slabAndScrews(),
  laneEngravings(),
  frontRuler(),
  labelPlate(),
].join('')
