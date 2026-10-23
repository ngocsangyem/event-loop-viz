// Every callback, frame and queued job as a card that moves between snapshots. A card that changes
// place flies along an arc while a hand-drawn arrow is drawn the same way, so the learner sees
// where each callback goes and in which direction; a new card arrives from the frame that made it.
import type { LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../film-clock'
import type { Layout } from '../layout'
import { clamp, easeOut, lerp, span } from '../lib/ease'
import { el, place, setStroke, setText, svgEl } from '../lib/dom'
import { arcPoint, sketchArrow, sketchRect } from '../lib/sketch'
import type { Point } from '../lib/sketch'
import { CONCEPT, slotsOf } from './item-slots'
import type { Slot } from './item-slots'
import { runtimeDim } from './panel-frame'

interface Card {
  root: HTMLDivElement
  kind: HTMLDivElement
  code: HTMLDivElement
  border: SVGPathElement
}

const center = (s: Slot): Point => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 })
/** Arc bend: flights curve away from the straight line, more for longer trips. */
const bendOf = (a: Point, b: Point) => Math.min(140, Math.hypot(b.x - a.x, b.y - a.y) * 0.22) * (a.x < b.x ? -1 : 1)

export function createItemLayer(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, clock: FilmClock, layout: Layout) {
  const layer = el('div', 'item-layer', stage)
  const cards = new Map<string, Card>()
  const arrows = Array.from({ length: 6 }, () => ({
    shaft: svgEl('path', { class: 'stroke stroke-arrow' }, strokes),
    head: svgEl('path', { class: 'stroke stroke-arrow' }, strokes),
  }))

  function card(id: string): Card {
    let c = cards.get(id)
    if (!c) {
      const root = el('div', 'card', layer)
      c = { root, kind: el('div', 'card-kind', root), code: el('div', 'card-code', root), border: svgEl('path', { class: 'stroke card-stroke' }, strokes) }
      cards.set(id, c)
    }
    return c
  }

  function paint(c: Card, s: Slot, at: { x: number; y: number; w: number; h: number }, opacity: number, key: string) {
    c.root.dataset.concept = CONCEPT[s.place]
    c.root.classList.toggle('is-top', s.top)
    c.root.style.width = `${at.w.toFixed(1)}px`
    c.root.style.height = `${at.h.toFixed(1)}px`
    setText(c.kind, s.kind)
    c.kind.style.display = s.kind ? '' : 'none'
    setText(c.code, s.code)
    place(c.root, at.x, at.y, opacity)
    c.border.dataset.concept = CONCEPT[s.place]
    setStroke(c.border, sketchRect(key, at.x, at.y, at.w, at.h, 1.6), opacity > 0.01 ? 1 : 0, opacity)
  }

  function render(frame: FrameInfo) {
    const dim = runtimeDim(frame, clock)
    const live = frame.scene === 'execute' || frame.scene === 'why'
    const from = slotsOf(frame.from, layout, plan)
    const to = slotsOf(frame.to, layout, plan)
    const p = frame.p
    // Where new work comes from: the frame on top of the stack before the move (setTimeout(), .then()…).
    const maker = [...from.values()].filter((s) => s.place === 'stack').find((s) => s.top)
    const flights: { a: Point; b: Point; key: string }[] = []
    const seen = new Set<string>()

    for (const [id, b] of to) {
      seen.add(id)
      const a = from.get(id)
      const c = card(id)
      if (a) {
        const moved = a.place !== b.place
        const pos = moved ? arcPoint(center(a), center(b), bendOf(center(a), center(b)), p) : { x: lerp(center(a).x, center(b).x, p), y: lerp(center(a).y, center(b).y, p) }
        const w = lerp(a.w, b.w, p)
        const h = lerp(a.h, b.h, p)
        if (moved) flights.push({ a: center(a), b: center(b), key: `${id}-${a.place}-${b.place}` })
        paint(c, p < 0.5 ? a : b, { x: pos.x - w / 2, y: pos.y - h / 2, w, h }, live ? dim : 0, `${id}-${moved ? 'f' : b.place}`)
      } else if (b.place === 'stack') {
        // A push: the frame is set down on top of the stack.
        const q = easeOut(clamp(p * 1.4))
        paint(c, b, { x: b.x, y: b.y - (1 - q) * 46, w: b.w, h: b.h }, (live ? dim : 0) * q, `${id}-stack`)
      } else {
        // New queued work flies out of the frame that created it (or slides in at the end of its queue).
        const origin = maker ? center(maker) : { x: b.x + b.w + 80, y: b.y + b.h / 2 }
        const end = center(b)
        const pos = arcPoint(origin, end, bendOf(origin, end), p)
        const s = lerp(0.6, 1, easeOut(p))
        if (maker) flights.push({ a: origin, b: end, key: `${id}-new` })
        paint(c, b, { x: pos.x - (b.w * s) / 2, y: pos.y - (b.h * s) / 2, w: b.w * s, h: b.h * s }, (live ? dim : 0) * clamp(p * 3), `${id}-${b.place}`)
      }
    }
    for (const [id, a] of from) {
      if (seen.has(id)) continue
      // Gone: a popped frame lifts off the stack; anything else is struck from its place.
      const c = card(id)
      const q = easeOut(p)
      const lift = a.place === 'stack' ? q * 40 : 0
      paint(c, a, { x: a.x, y: a.y - lift, w: a.w, h: a.h }, (live ? dim : 0) * (1 - q), `${id}-${a.place}`)
      seen.add(id)
    }
    for (const [id, c] of cards) {
      if (!seen.has(id)) {
        place(c.root, 0, 0, 0)
        setStroke(c.border, '', 0)
      }
    }

    // A print: an arrow from the logging frame to the new console line.
    if (frame.to.console.length > frame.from.console.length && maker) {
      const row = frame.from.console.length
      const r = layout.console
      const y = r.y + 76 + Math.min(row, consoleRows(layout) - 1) * consoleRowH + consoleRowH / 2
      flights.push({ a: { x: maker.x, y: maker.y + maker.h / 2 }, b: { x: r.x + r.w - 40, y }, key: `print-${row}` })
    }

    arrows.forEach((arrow, i) => {
      const f = flights[i]
      if (!f || !live) {
        setStroke(arrow.shaft, '', 0)
        setStroke(arrow.head, '', 0)
        return
      }
      const { shaft, head } = sketchArrow(f.key, shorten(f.a, f.b, 30), shorten(f.b, f.a, 36), bendOf(f.a, f.b))
      setStroke(arrow.shaft, shaft, span(p, 0, 0.75), dim)
      setStroke(arrow.head, head, span(p, 0.7, 0.9), dim)
    })
  }

  return { render }
}

export const consoleRowH = 42
export const consoleRows = (layout: Layout) => Math.max(1, Math.floor((layout.console.h - 76 - 16) / consoleRowH))

/** Moves `a` toward `b` by `px`, so arrows start and end just outside the cards. */
function shorten(a: Point, b: Point, px: number): Point {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const k = Math.min(px, d / 3) / d
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}
