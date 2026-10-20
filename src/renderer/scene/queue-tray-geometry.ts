import * as k from './iso-kit'
import { P, at, dots, line, solid } from './scene-world'

/**
 * A queue tray: a trough with a run pad at one end. Queued entries are tokens standing in
 * the trough head first from the pad outward; the entry that is running sits on the pad,
 * so "begin" is literally a token sliding out of the trough onto the pad that feeds the
 * rest of the machine. The microtask queue and the task queue are two trays of this kind.
 */
const PAD_W = 20
const LANE_GAP = 6
const BASE_H = 4
const RAIL_H = 3.5

/** Tokens drawn per tray; deeper queues show their head and a "+n" count. */
export const QUEUE_DRAW_CAP = 24
export const FULL_PITCH = 15
export const MAX_TOKEN_W = 13
export const TOKEN_Z = BASE_H + 1
export const TOKEN_H = 8

export interface TrayLayout {
  region: k.Plan
  /** Footprint of the run pad. */
  pad: k.Plan
  /** Footprint of the token that is running, centred on the pad. */
  running: k.Plan
  /** Left end and length of the trough floor the queued tokens stand on. */
  laneX0: number
  laneLength: number
  /** Footprint depth and offset of every token in the trough. */
  tokenY: number
  tokenD: number
}

export function layoutOf(region: k.Plan): TrayLayout {
  const pad: k.Plan = { x: region.x + 4, y: region.y + 7, w: PAD_W, d: region.d - 19, r: 2 }
  const laneX0 = pad.x + PAD_W + LANE_GAP
  return {
    region,
    pad,
    running: { x: pad.x + 2, y: region.y + 9, w: PAD_W - 4, d: region.d - 23, r: 2 },
    laneX0,
    laneLength: region.x + region.w - 4 - laneX0,
    tokenY: region.y + 9,
    tokenD: region.d - 23,
  }
}

/** Distance between neighbouring tokens: full pitch, compressed once the trough is full. */
export const pitchFor = (layout: TrayLayout, count: number) =>
  count * FULL_PITCH <= layout.laneLength ? FULL_PITCH : layout.laneLength / Math.max(1, count)

export function tokenPlan(layout: TrayLayout, index: number, pitch: number): k.Plan {
  const w = Math.min(MAX_TOKEN_W, pitch - 2)
  return { x: layout.laneX0 + index * pitch + 1, y: layout.tokenY, w, d: layout.tokenD, r: 1.2 }
}

export const tokenShape = (plan: k.Plan, z = TOKEN_Z, height = TOKEN_H) =>
  k.slabOf(plan, z, height, P, 4, Math.min(0.5, plan.w / 8))

/** Everything that sits under and behind the tokens. */
export function trayBackSvg(layout: TrayLayout, name: string): string {
  const { region, pad } = layout
  const out = [`<path class="iso-halo" d="${k.haloOf(region, 0, BASE_H, P)}"/>`]
  out.push(solid(k.slabOf(region, 0, BASE_H, P, 6, 0.8), { tone: 'lo' }))
  out.push(line(k.planOutline(k.insetPlan(region, 2.5), BASE_H, P, 6), { tone: 'faint' }))
  // Run pad with a recessed rim, and the floor of the trough.
  out.push(solid(k.slabOf(pad, BASE_H, 0.8, P, 4), { tone: 'mid', crease: 'none' }))
  out.push(line(k.planOutline(k.insetPlan(pad, 1.8), BASE_H + 0.8, P, 4), { tone: 'lo' }))
  const floor: k.Plan = {
    x: layout.laneX0 - 3,
    y: region.y + 7,
    w: layout.laneLength + 3,
    d: region.d - 19,
    r: 1,
  }
  out.push(solid(k.slabOf(floor, BASE_H, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  // Far rail, then the posts that gate the pad and the stop at the tail of the trough.
  const farRail: k.Plan = { x: floor.x, y: region.y + 4, w: floor.w + 1, d: 3, r: 0.8 }
  out.push(solid(k.slabOf(farRail, BASE_H, RAIL_H, P, 3, 0.3), { tone: 'mid' }))
  const stop: k.Plan = { x: floor.x + floor.w - 2, y: floor.y, w: 3.5, d: floor.d, r: 0.8 }
  out.push(solid(k.slabOf(stop, BASE_H, 7, P, 3, 0.3), { tone: 'mid' }))
  const gateY = [region.y + 5.5, region.y + region.d - 10.5]
  for (const y of gateY) {
    out.push(solid(k.cylinder(layout.laneX0 - 3, y, 1.8, BASE_H, 9, P, 14, 0.3), { tone: 'mid' }))
  }
  const screws = [
    ...k.corners(region, 5).map(([x, y]) => at([x, y, BASE_H])),
    ...[pad.x + 3, pad.x + pad.w - 3].flatMap((x) =>
      [pad.y + 3, pad.y + pad.d - 3].map((y) => at([x, y, BASE_H + 0.8])),
    ),
  ]
  out.push(dots(screws, { size: 0.5 }))
  out.push(
    `<g class="iso-face-text" data-tone="lo" transform="${nameMatrix(layout)}" font-size="3.8">` +
      `<text x="0" y="0">${name}</text></g>`,
  )
  return out.join('')
}

/** The near rail: drawn after the tokens so they read as standing inside the trough. */
export function trayFrontSvg(layout: TrayLayout): string {
  const { region } = layout
  const rail: k.Plan = {
    x: layout.laneX0 - 3,
    y: region.y + region.d - 12,
    w: layout.laneLength + 4,
    d: 3,
    r: 0.8,
  }
  const out = [solid(k.slabOf(rail, BASE_H, RAIL_H, P, 3, 0.3), { tone: 'mid' })]
  const bolts = [rail.x + 4, rail.x + rail.w - 4].map((x) => at([x, rail.y + 1.5, BASE_H + RAIL_H]))
  out.push(dots(bolts, { size: 0.45 }))
  return out.join('')
}

/** Engraved name along the front strip, and the origin for the "+n" overflow count. */
export const nameMatrix = (layout: TrayLayout) =>
  k.topMatrix([layout.region.x + 6, layout.region.y + layout.region.d - 3.4], BASE_H, P, 'x')
export const overflowMatrix = (layout: TrayLayout) =>
  k.topMatrix(
    [layout.region.x + layout.region.w - 6, layout.region.y + layout.region.d - 3.4],
    BASE_H,
    P,
    'x',
  )

/** Matrix for text lying along the depth axis on top of a token, centred on its footprint. */
export const tokenTextMatrix = (plan: k.Plan, fontSize: number, z = TOKEN_Z + TOKEN_H) =>
  k.topMatrix([plan.x + plan.w / 2 + fontSize * 0.34, plan.y + plan.d / 2], z, P, 'y')

/** A font size that fits `text` in `length` units, at most `max`. */
export const fitFont = (text: string, length: number, max = 5) =>
  Math.min(max, length / (Math.max(1, text.length) * 0.62))
