// Hand-drawn strokes as SVG path data. Each shape is a few slightly wobbly passes, seeded by a key
// so the same shape keeps the same wobble on every frame (no boiling). Draw-on uses pathLength=1
// with a dash offset, so any stroke can be "drawn" from 0 to 1.
import { mulberry32, seedOf } from './ease'

export interface Point {
  x: number
  y: number
}

const f = (n: number) => n.toFixed(1)

/** A slightly bowed line from a to b (one pass). */
function bowedLine(a: Point, b: Point, rand: () => number, wobble: number): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const bow = (rand() - 0.5) * Math.min(wobble, len * 0.03) * 2
  const jit = () => (rand() - 0.5) * wobble * 0.6
  const c1 = { x: a.x + dx * 0.33 + nx * bow + jit(), y: a.y + dy * 0.33 + ny * bow + jit() }
  const c2 = { x: a.x + dx * 0.66 + nx * bow + jit(), y: a.y + dy * 0.66 + ny * bow + jit() }
  return `M${f(a.x + jit())},${f(a.y + jit())} C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(b.x + jit())},${f(b.y + jit())}`
}

/** A rectangle as one continuous wobbly loop (so it draws on in one motion), overshooting its start. */
export function sketchRect(key: string, x: number, y: number, w: number, h: number, wobble = 2.2): string {
  const rand = mulberry32(seedOf(key))
  const j = () => (rand() - 0.5) * wobble
  const corners: Point[] = [
    { x: x + j(), y: y + j() },
    { x: x + w + j(), y: y + j() },
    { x: x + w + j(), y: y + h + j() },
    { x: x + j(), y: y + h + j() },
  ]
  let d = `M${f(corners[0]!.x)},${f(corners[0]!.y)}`
  for (let i = 1; i <= 4; i++) {
    const a = corners[i - 1]!
    const b = i === 4 ? { x: corners[0]!.x + 6 + j(), y: corners[0]!.y + j() } : corners[i]!
    const seg = bowedLine(a, b, rand, wobble)
    d += ' ' + seg.slice(seg.indexOf('C'))
  }
  return d
}

/** A loose ellipse drawn as one stroke that overlaps itself a little, like circling a word. */
export function sketchEllipse(key: string, cx: number, cy: number, rx: number, ry: number, turns = 1.12): string {
  const rand = mulberry32(seedOf(key))
  const start = rand() * Math.PI * 2
  const steps = 40
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const a = start + (i / steps) * Math.PI * 2 * turns
    const r = 1 + (rand() - 0.5) * 0.05 + (i / steps) * 0.04
    pts.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r })
  }
  return smoothThrough(pts)
}

/** Catmull-Rom through points, as cubic Béziers. */
export function smoothThrough(pts: Point[]): string {
  let d = `M${f(pts[0]!.x)},${f(pts[0]!.y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    d += ` C${f(p1.x + (p2.x - p0.x) / 6)},${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)},${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)},${f(p2.y)}`
  }
  return d
}

/** The point at `p` (0..1) along a quadratic curve from a to b bent by `bend` px. */
export function arcPoint(a: Point, b: Point, bend: number, p: number): Point {
  const c = arcControl(a, b, bend)
  const q = 1 - p
  return { x: q * q * a.x + 2 * q * p * c.x + p * p * b.x, y: q * q * a.y + 2 * q * p * c.y + p * p * b.y }
}

function arcControl(a: Point, b: Point, bend: number): Point {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: mx - (dy / len) * bend, y: my + (dx / len) * bend }
}

/** A hand-drawn arrow along the same arc an item travels: shaft plus a two-stroke head. */
export function sketchArrow(key: string, a: Point, b: Point, bend: number): { shaft: string; head: string } {
  const rand = mulberry32(seedOf(key))
  const pts: Point[] = []
  for (let i = 0; i <= 16; i++) {
    const p = arcPoint(a, b, bend, i / 16)
    const w = Math.sin((i / 16) * Math.PI) * 2.2
    pts.push({ x: p.x + (rand() - 0.5) * w, y: p.y + (rand() - 0.5) * w })
  }
  const end = pts[pts.length - 1]!
  const before = arcPoint(a, b, bend, 0.9)
  const angle = Math.atan2(end.y - before.y, end.x - before.x)
  const len = 20
  const wing = (side: number) => ({
    x: end.x - Math.cos(angle + side * 0.5) * len,
    y: end.y - Math.sin(angle + side * 0.5) * len,
  })
  const l = wing(1)
  const r = wing(-1)
  return { shaft: smoothThrough(pts), head: `M${f(l.x)},${f(l.y)} L${f(end.x)},${f(end.y)} L${f(r.x)},${f(r.y)}` }
}

/** A quick underline stroke under a word, slightly rising to the right. */
export function sketchUnderline(key: string, x: number, y: number, w: number): string {
  const rand = mulberry32(seedOf(key))
  return bowedLine({ x, y: y + rand() * 2 }, { x: x + w, y: y - 3 - rand() * 3 }, rand, 3)
}
