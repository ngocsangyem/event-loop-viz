/** Pure 2D helpers for the diagram: connector paths, arrowheads and card outlines. */

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Corner radius of cards and connector bends. Zero: the warm terminal system draws square,
 * ruled shapes. The outline and sampling code still accept a radius, so the arcs collapse to
 * points and every animation keeps its path.
 */
export const CARD_RADIUS = 0
export const BEND_RADIUS = 0

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
const f = (n: number) => Math.round(n * 100) / 100
const at = (a: Point, b: Point, d: number): Point => {
  const len = dist(a, b)
  return len === 0 ? a : { x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len }
}

/** Length of a polyline: the travel distance the signal duration is based on. */
export function polylineLength(points: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1]!, points[i]!)
  return total
}

/** True when every segment of the polyline is horizontal or vertical. */
export function isOrthogonal(points: readonly Point[]): boolean {
  return points.every((p, i) => i === 0 || p.x === points[i - 1]!.x || p.y === points[i - 1]!.y)
}

/** A polyline with every bend rounded (quadratic corner), the radius shrinking on short legs. */
export function roundedPath(points: readonly Point[], radius = BEND_RADIUS): string {
  const first = points[0]
  if (!first) return ''
  let d = `M${f(first.x)} ${f(first.y)}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!
    const corner = points[i]!
    const next = points[i + 1]!
    const r = Math.min(radius, dist(prev, corner) / 2, dist(corner, next) / 2)
    const from = at(corner, prev, r)
    const to = at(corner, next, r)
    d += `L${f(from.x)} ${f(from.y)}Q${f(corner.x)} ${f(corner.y)} ${f(to.x)} ${f(to.y)}`
  }
  const last = points[points.length - 1]!
  return `${d}L${f(last.x)} ${f(last.y)}`
}

/**
 * The points a rounded path passes through, spaced about `step` apart: the keyframes the signal
 * dot follows. Corners are cut the same way `roundedPath` cuts them.
 */
export function samplePath(points: readonly Point[], step = 6, radius = BEND_RADIUS): Point[] {
  const out: Point[] = []
  const push = (p: Point) => out.push({ x: f(p.x), y: f(p.y) })
  if (points.length === 0) return out
  push(points[0]!)
  let cursor = points[0]!
  for (let i = 1; i < points.length; i++) {
    const corner = points[i]!
    const next = points[i + 1]
    const r = next ? Math.min(radius, dist(points[i - 1]!, corner) / 2, dist(corner, next) / 2) : 0
    const entry = at(corner, points[i - 1]!, r)
    const legs = Math.max(1, Math.round(dist(cursor, entry) / step))
    for (let k = 1; k <= legs; k++) push({ x: cursor.x + ((entry.x - cursor.x) * k) / legs, y: cursor.y + ((entry.y - cursor.y) * k) / legs })
    if (next && r > 0) {
      const exit = at(corner, next, r)
      for (let k = 1; k <= 4; k++) {
        const u = k / 4
        push({
          x: (1 - u) * (1 - u) * entry.x + 2 * u * (1 - u) * corner.x + u * u * exit.x,
          y: (1 - u) * (1 - u) * entry.y + 2 * u * (1 - u) * corner.y + u * u * exit.y,
        })
      }
      cursor = exit
    } else cursor = entry
  }
  return out
}

/** Direction (unit vector) the path arrives with. */
export function arrivalDirection(points: readonly Point[]): Point {
  const a = points[points.length - 2]!
  const b = points[points.length - 1]!
  const len = dist(a, b) || 1
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
}

/** A filled triangle whose tip sits on the end of the path. */
export function arrowheadPath(points: readonly Point[], size = 7): string {
  const tip = points[points.length - 1]!
  const dir = arrivalDirection(points)
  const base = { x: tip.x - dir.x * size, y: tip.y - dir.y * size }
  const half = size * 0.62
  const l = { x: base.x - dir.y * half, y: base.y + dir.x * half }
  const r = { x: base.x + dir.y * half, y: base.y - dir.x * half }
  return `M${f(tip.x)} ${f(tip.y)}L${f(l.x)} ${f(l.y)}L${f(r.x)} ${f(r.y)}Z`
}

/** The point halfway along the polyline's longest segment, where labels and pills sit. */
export function longestSegmentMidpoint(points: readonly Point[]): Point {
  let best = { a: points[0]!, b: points[points.length - 1]!, len: -1 }
  for (let i = 1; i < points.length; i++) {
    const len = dist(points[i - 1]!, points[i]!)
    if (len > best.len) best = { a: points[i - 1]!, b: points[i]!, len }
  }
  return { x: (best.a.x + best.b.x) / 2, y: (best.a.y + best.b.y) / 2 }
}

type Segment = { line: true; from: Point; to: Point } | { line: false; from: Point; to: Point; sweep: 0 | 1 }

/** The card outline clockwise from the top-left corner's end: four sides and four arcs. */
function outlineSegments(rect: Rect, r: number): Segment[] {
  const { x, y, w, h } = rect
  const p = (px: number, py: number): Point => ({ x: px, y: py })
  return [
    { line: true, from: p(x + r, y), to: p(x + w - r, y) },
    { line: false, from: p(x + w - r, y), to: p(x + w, y + r), sweep: 1 },
    { line: true, from: p(x + w, y + r), to: p(x + w, y + h - r) },
    { line: false, from: p(x + w, y + h - r), to: p(x + w - r, y + h), sweep: 1 },
    { line: true, from: p(x + w - r, y + h), to: p(x + r, y + h) },
    { line: false, from: p(x + r, y + h), to: p(x, y + h - r), sweep: 1 },
    { line: true, from: p(x, y + h - r), to: p(x, y + r) },
    { line: false, from: p(x, y + r), to: p(x + r, y), sweep: 1 },
  ]
}

/** Length of the card outline: the dash length that hides or shows all of it. */
export function outlineLength(rect: Rect, r = CARD_RADIUS): number {
  return 2 * (rect.w + rect.h) - 8 * r + 2 * Math.PI * r
}

const onSegment = (s: Segment, p: Point) =>
  s.line &&
  p.x >= Math.min(s.from.x, s.to.x) - 0.5 &&
  p.x <= Math.max(s.from.x, s.to.x) + 0.5 &&
  p.y >= Math.min(s.from.y, s.to.y) - 0.5 &&
  p.y <= Math.max(s.from.y, s.to.y) + 0.5 &&
  (s.from.x === s.to.x ? Math.abs(p.x - s.from.x) < 0.5 : Math.abs(p.y - s.from.y) < 0.5)

/**
 * The card outline as one closed path that starts and ends at `start` (a point on a side) and
 * runs clockwise or counter-clockwise. Drawing it in from `start` in both directions makes the
 * border grow out of the point where the arrow met the card. A start that is not on a side (or
 * sits in a corner) snaps to the middle of the top side.
 */
export function outlinePathFrom(rect: Rect, start: Point, clockwise: boolean, r = CARD_RADIUS): string {
  let segments = outlineSegments(rect, r)
  let index = segments.findIndex((s) => onSegment(s, start))
  let p = start
  if (index < 0) {
    index = 0
    p = { x: rect.x + rect.w / 2, y: rect.y }
  }
  if (!clockwise) {
    segments = segments
      .map((s): Segment => (s.line ? { line: true, from: s.to, to: s.from } : { line: false, from: s.to, to: s.from, sweep: 0 }))
      .reverse()
    index = segments.length - 1 - index
  }
  const hit = segments[index]!
  const draw = (s: Segment) => (s.line ? `L${f(s.to.x)} ${f(s.to.y)}` : `A${r} ${r} 0 0 ${s.sweep} ${f(s.to.x)} ${f(s.to.y)}`)
  let d = `M${f(p.x)} ${f(p.y)}L${f(hit.to.x)} ${f(hit.to.y)}`
  for (let k = 1; k < segments.length; k++) d += draw(segments[(index + k) % segments.length]!)
  return `${d}L${f(p.x)} ${f(p.y)}`
}
