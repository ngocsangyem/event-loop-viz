import { polylineLength, samplePath } from './diagram-geometry'
import type { Point } from './diagram-geometry'

/** Travel time bounds, ms: short hops stay readable, long ones do not drag. */
export const SIGNAL_MIN_MS = 360
export const SIGNAL_MAX_MS = 820
/** Milliseconds of travel per unit of path length, before clamping. */
const MS_PER_UNIT = 1.6
/** Pause between two hops of one step (Task Queue to Event Loop, then to the Call Stack). */
export const HOP_GAP_MS = 70
/** How long a card's border takes to draw in, and an arrowhead or pill to fade. */
export const DRAW_MS = 460
export const FADE_MS = 160

/** Travel time of the signal along a path, proportional to its length and clamped. */
export function signalDuration(length: number): number {
  return Math.min(SIGNAL_MAX_MS, Math.max(SIGNAL_MIN_MS, Math.round(length * MS_PER_UNIT)))
}

export interface Hop {
  /** When the signal leaves, ms after the step starts. */
  start: number
  duration: number
  /** When it arrives: the target card's border starts drawing here. */
  arrival: number
}

/** Back-to-back hops for the paths of one step. */
export function scheduleHops(paths: readonly (readonly Point[])[]): Hop[] {
  let start = 0
  return paths.map((points) => {
    const duration = signalDuration(polylineLength(points))
    const hop = { start, duration, arrival: start + duration }
    start = hop.arrival + HOP_GAP_MS
    return hop
  })
}

export interface SignalFrame {
  /** 0..1 share of the path travelled, by distance, so the dot moves at constant speed. */
  offset: number
  transform: string
}

/** Keyframes that move a dot along the rounded path, spaced by distance. */
export function signalKeyframes(points: readonly Point[]): SignalFrame[] {
  const samples = samplePath(points)
  const steps: number[] = [0]
  for (let i = 1; i < samples.length; i++) {
    steps.push(steps[i - 1]! + Math.hypot(samples[i]!.x - samples[i - 1]!.x, samples[i]!.y - samples[i - 1]!.y))
  }
  const total = steps[steps.length - 1] || 1
  return samples.map((p, i) => ({ offset: Math.min(1, steps[i]! / total), transform: `translate(${p.x}px, ${p.y}px)` }))
}
