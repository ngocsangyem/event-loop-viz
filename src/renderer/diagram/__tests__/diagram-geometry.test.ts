import { describe, expect, it } from 'vitest'
import { EDGE_ENDS, EDGE_IDS, NODE_IDS } from '../diagram-flow'
import { isOrthogonal, outlineLength, outlinePathFrom, polylineLength, roundedPath, samplePath } from '../diagram-geometry'
import type { Point, Rect } from '../diagram-geometry'
import { NARROW_BELOW, NARROW_LAYOUT, WIDE_LAYOUT, layoutFor } from '../diagram-layout'
import { SIGNAL_MAX_MS, SIGNAL_MIN_MS, scheduleHops, signalDuration, signalKeyframes } from '../diagram-signal'
import { charsThatFit, truncate } from '../diagram-text'

const onBorder = (r: Rect, p: Point) => {
  const insideX = p.x >= r.x && p.x <= r.x + r.w
  const insideY = p.y >= r.y && p.y <= r.y + r.h
  const onVertical = (p.x === r.x || p.x === r.x + r.w) && insideY
  const onHorizontal = (p.y === r.y || p.y === r.y + r.h) && insideX
  return onVertical || onHorizontal
}

describe.each([WIDE_LAYOUT, NARROW_LAYOUT])('$id layout', (layout) => {
  it('places every card inside the canvas without overlaps', () => {
    const rects = NODE_IDS.map((id) => layout.nodes[id])
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w).toBeLessThanOrEqual(layout.width)
      expect(r.y + r.h).toBeLessThanOrEqual(layout.height)
    }
    rects.forEach((a, i) =>
      rects.slice(i + 1).forEach((b) => {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
        expect(apart).toBe(true)
      }),
    )
  })

  it.each(EDGE_IDS)('edge %s runs orthogonally from its source border to its target border', (id) => {
    const { points } = layout.edges[id]
    expect(isOrthogonal(points)).toBe(true)
    expect(onBorder(layout.nodes[EDGE_ENDS[id].from], points[0]!)).toBe(true)
    expect(onBorder(layout.nodes[EDGE_ENDS[id].to], points[points.length - 1]!)).toBe(true)
  })
})

describe('layoutFor', () => {
  it('goes vertical on narrow containers, and wide before the width is known', () => {
    expect(layoutFor(375)).toBe(NARROW_LAYOUT)
    expect(layoutFor(NARROW_BELOW)).toBe(WIDE_LAYOUT)
    expect(layoutFor(0)).toBe(WIDE_LAYOUT)
  })
})

describe('path helpers', () => {
  const bent: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }]
  it('measures a polyline', () => {
    expect(polylineLength(bent)).toBe(150)
    expect(polylineLength([])).toBe(0)
  })
  it('spots diagonals', () => {
    expect(isOrthogonal(bent)).toBe(true)
    expect(isOrthogonal([{ x: 0, y: 0 }, { x: 5, y: 5 }])).toBe(false)
  })
  it('rounds bends with a quadratic corner', () => {
    expect(roundedPath(bent, 10)).toBe('M0 0L90 0Q100 0 100 10L100 50')
  })
  it('samples from the start to the end of the path', () => {
    const samples = samplePath(bent)
    expect(samples[0]).toEqual({ x: 0, y: 0 })
    expect(samples[samples.length - 1]).toEqual({ x: 100, y: 50 })
  })
})

describe('card outline', () => {
  const rect: Rect = { x: 10, y: 20, w: 100, h: 60 }
  it('has the length of a rounded rectangle', () => {
    expect(outlineLength(rect, 12)).toBeCloseTo(2 * 160 - 96 + 2 * Math.PI * 12, 5)
  })
  it.each([true, false])('starts and ends at the entry point (clockwise: %s)', (clockwise) => {
    const entry = { x: 110, y: 50 }
    const d = outlinePathFrom(rect, entry, clockwise)
    expect(d.startsWith('M110 50')).toBe(true)
    expect(d.endsWith('L110 50')).toBe(true)
    expect(d.match(/A/g)).toHaveLength(4)
  })
  it('snaps an entry that is not on a side to the top middle', () => {
    expect(outlinePathFrom(rect, { x: 0, y: 0 }, true).startsWith('M60 20')).toBe(true)
  })
})

describe('signal timing', () => {
  it('grows with length and is clamped', () => {
    expect(signalDuration(1)).toBe(SIGNAL_MIN_MS)
    expect(signalDuration(100000)).toBe(SIGNAL_MAX_MS)
    expect(signalDuration(300)).toBeGreaterThan(signalDuration(250))
  })
  it('runs hops back to back', () => {
    const [a, b] = scheduleHops([[{ x: 0, y: 0 }, { x: 70, y: 0 }], [{ x: 0, y: 0 }, { x: 70, y: 0 }]])
    expect(a!.start).toBe(0)
    expect(b!.start).toBeGreaterThan(a!.arrival)
  })
  it('spaces keyframes by distance from 0 to 1', () => {
    const frames = signalKeyframes([{ x: 0, y: 0 }, { x: 60, y: 0 }])
    expect(frames[0]!.offset).toBe(0)
    expect(frames[frames.length - 1]!.offset).toBe(1)
    expect(frames[0]!.transform).toBe('translate(0px, 0px)')
  })
})

describe('truncate', () => {
  it('cuts with an ellipsis only when needed', () => {
    expect(truncate('abc', 5)).toBe('abc')
    expect(truncate('abcdefgh', 5)).toBe('abcd…')
    expect(truncate('abc', 0)).toBe('')
    expect(charsThatFit(72)).toBe(10)
  })
})
