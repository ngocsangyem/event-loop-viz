// Every frame, callback and queued job as a card. A frame is set down on the stack faint and
// solidifies; a Web API card fills its callback and delay slots; a finished timer's card wobbles
// before it leaves; work taken from a queue travels through the Event Loop column on its way to
// the stack, so the learner sees that the loop is what moves it.
import type { LessonPlan } from '../../lesson-types'
import type { FrameInfo } from '../../film/film-clock'
import { clamp, easeInOut, easeOut, lerp, span } from '../../film/lib/ease'
import { el, place, setText } from '../../film/lib/dom'
import { arcPoint } from '../../film/lib/sketch'
import type { Point } from '../../film/lib/sketch'
import type { VisLayout } from '../vis-layout'
import type { Part, Spotlight } from '../vis-focus'
import { visSlotsOf } from '../vis-slots'
import type { Place, Slot } from '../vis-slots'
import { visHighlight } from '../vis-syntax'

interface Card {
  root: HTMLDivElement
  tag: HTMLDivElement
  api: HTMLDivElement
  cbLabel: HTMLDivElement
  code: HTMLDivElement
  value: HTMLDivElement
  valueLabel: HTMLDivElement
  valueText: HTMLDivElement
}

const PART: Record<Place, Part> = { stack: 'stack', webApis: 'webApis', tasks: 'tasks', microtasks: 'microtasks', picked: 'loop' }
const center = (s: Slot): Point => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 })
const bendOf = (a: Point, b: Point) => Math.min(120, Math.hypot(b.x - a.x, b.y - a.y) * 0.2) * (a.x < b.x ? -1 : 1)

export function createVisCards(stage: HTMLElement, plan: LessonPlan, layout: VisLayout, spot: Spotlight) {
  const layer = el('div', 'v-cards', stage)
  const cards = new Map<string, Card>()
  const loopCenter = { x: layout.loop.x + layout.loop.w / 2, y: layout.loop.y + layout.loop.h * 0.42 }

  function card(id: string): Card {
    let c = cards.get(id)
    if (!c) {
      const root = el('div', 'v-card', layer)
      const tag = el('div', 'v-tag', root)
      const api = el('div', 'v-api', root)
      const main = el('div', 'v-card-main', root)
      const cbLabel = el('div', 'v-slot-label', main)
      cbLabel.textContent = plan.labels.callback ?? 'callback'
      const code = el('div', 'v-card-code', main)
      const value = el('div', 'v-value', root)
      const valueLabel = el('div', 'v-slot-label', value)
      const valueText = el('div', 'v-value-text', value)
      c = { root, tag, api, cbLabel, code, value, valueLabel, valueText }
      cards.set(id, c)
    }
    return c
  }

  /** Draws a card as slot `s` at box `at`; `fill` (0–1) writes in a new Web API card's slots. */
  function paint(c: Card, s: Slot, at: { x: number; y: number; w: number; h: number }, opacity: number, extra = '', fill = 1) {
    c.root.dataset.place = s.place
    c.root.style.width = `${at.w.toFixed(1)}px`
    c.root.style.height = `${at.h.toFixed(1)}px`
    setText(c.tag, s.tag)
    setText(c.api, s.api ?? '')
    if (c.code.dataset.src !== s.code) {
      c.code.dataset.src = s.code
      c.code.innerHTML = visHighlight(s.code)
    }
    setText(c.valueLabel, s.value?.label ?? '')
    setText(c.valueText, s.value?.text ?? '')
    c.value.classList.toggle('is-number', s.value?.number ?? false)
    c.value.style.display = s.value ? '' : 'none'
    c.code.style.opacity = String(span(fill, 0.3, 0.7))
    c.value.style.opacity = String(span(fill, 0.55, 1))
    place(c.root, at.x, at.y, opacity, extra)
  }

  function render(frame: FrameInfo) {
    const live = frame.scene === 'execute' || frame.scene === 'why'
    const from = visSlotsOf(frame.from, layout)
    const to = visSlotsOf(frame.to, layout)
    const p = frame.p
    const seen = new Set<string>()
    const lit = (s: Slot) => (live ? spot(frame, PART[s.place]) : 0)

    for (const [id, b] of to) {
      seen.add(id)
      const c = card(id)
      const a = from.get(id)
      c.root.style.zIndex = '1'
      if (a && a.place === b.place) {
        // Same place: slide to the new position (a queue moving up).
        paint(c, b, { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) }, lit(b))
      } else if (a) {
        // A move between places. A finished Web API job wobbles first, then flies.
        const wobble = a.place === 'webApis' ? span(p, 0, 0.3) : 1
        const q = a.place === 'webApis' ? easeInOut(span(p, 0.3, 1)) : p
        const deg = wobble < 1 ? Math.sin(wobble * Math.PI * 4) * 3 * (1 - wobble * 0.5) : 0
        let pos: Point
        if ((a.place === 'tasks' || a.place === 'microtasks') && b.place === 'stack') {
          // Through the event loop: queue → loop → stack.
          pos = q < 0.5 ? arcPoint(center(a), loopCenter, bendOf(center(a), loopCenter), q * 2) : arcPoint(loopCenter, center(b), bendOf(loopCenter, center(b)), q * 2 - 1)
        } else {
          pos = arcPoint(center(a), center(b), bendOf(center(a), center(b)), q)
        }
        const shape = q < 0.15 ? a : b
        const w = lerp(a.w, b.w, q)
        const h = lerp(a.h, b.h, q)
        c.root.style.zIndex = '3'
        paint(c, shape, { x: pos.x - w / 2, y: pos.y - h / 2, w, h }, lerp(lit(a), lit(b), q), deg ? ` rotate(${deg.toFixed(2)}deg)` : '')
      } else if (b.place === 'stack') {
        // A push: the frame appears in place, faint, and solidifies.
        paint(c, b, b, lit(b) * (0.3 + 0.7 * easeOut(span(p, 0, 0.6))))
      } else if (b.place === 'webApis') {
        // Registration: the card opens, then its callback and value are written in.
        const s = easeOut(span(p, 0, 0.45))
        paint(c, b, b, lit(b) * s, ` scale(${lerp(0.96, 1, s).toFixed(4)})`, p)
      } else {
        // New queued work slides in at the end of its queue.
        const s = easeOut(span(p, 0, 0.6))
        paint(c, b, { ...b, x: b.x - (1 - s) * 30 }, lit(b) * clamp(s * 1.2))
      }
    }
    for (const [id, a] of from) {
      if (seen.has(id)) continue
      seen.add(id)
      paint(card(id), a, a, lit(a) * (1 - easeOut(span(p, 0, 0.6))))
    }
    for (const [id, c] of cards) if (!seen.has(id)) place(c.root, 0, 0, 0)
  }

  return { render }
}
