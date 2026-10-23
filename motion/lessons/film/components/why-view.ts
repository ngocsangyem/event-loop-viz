// Scene 4: "Why this order?" A board over the runtime area. Each reason is written in as its
// sentence starts (number circled by hand), the one being explained stays bright, and the final
// output order runs along the bottom so the reasons stay tied to what was printed.
import type { LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../film-clock'
import type { Layout } from '../layout'
import { easeOut, lerp, span } from '../lib/ease'
import { el, place, setStroke, svgEl } from '../lib/dom'
import { sketchEllipse, sketchRect } from '../lib/sketch'

export function createWhyView(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, clock: FilmClock, layout: Layout) {
  const x = layout.stack.x
  const y = layout.stack.y
  const w = 1864 - x
  const h = 908 - y
  const root = el('div', 'why', stage)
  Object.assign(root.style, { width: `${w}px`, height: `${h}px` })
  const heading = el('div', 'why-heading hand', root)
  heading.textContent = plan.labels.why!
  const border = svgEl('path', { class: 'stroke stroke-ink' }, strokes)
  const borderD = sketchRect('why-board', x, y, w, h, 2.4)
  const whyBeats = plan.beats.filter((b) => b.scene === 'why')
  const points = whyBeats.map((beat, i) => {
    const row = el('div', 'why-point', root)
    const num = el('div', 'why-num', row)
    num.textContent = String(i + 1)
    el('div', 'why-title', row).textContent = beat.title ?? ''
    const circle = svgEl('path', { class: 'stroke stroke-accent' }, strokes)
    return { beat, row, circle }
  })
  const strip = el('div', 'why-output', root)
  plan.output.forEach((text, i) => {
    if (i > 0) el('span', 'why-sep', strip).textContent = '→'
    el('span', 'why-out', strip).textContent = text
  })
  const rowGap = Math.min(128, (h - 260) / Math.max(1, points.length))

  function render(frame: FrameInfo) {
    const start = clock.sceneStart('why')
    const enter = easeOut(span(frame.t, start, start + 0.9))
    const leave = easeOut(span(frame.t, clock.sceneStart('recap'), clock.sceneStart('recap') + 0.6))
    const opacity = enter * (1 - leave)
    place(root, x, y + lerp(24, 0, enter), opacity)
    setStroke(border, borderD, enter, 1 - leave)
    points.forEach((point, i) => {
      const at = clock.beatStart(point.beat.id) + 0.2
      const p = easeOut(span(frame.t, at, at + 0.7))
      const current = frame.beat.id === point.beat.id
      const rowY = 130 + i * rowGap
      point.row.style.transform = `translate(${lerp(-24, 0, p).toFixed(1)}px, ${rowY}px)`
      point.row.style.opacity = String(p * (current || frame.scene !== 'why' ? 1 : 0.5))
      point.row.classList.toggle('is-current', current)
      const cx = x + 66
      const cy = y + rowY + 30 + lerp(24, 0, enter)
      setStroke(point.circle, sketchEllipse(`why-${i}`, cx, cy, 30, 27), span(frame.t, at + 0.3, at + 0.9), opacity)
    })
    strip.style.opacity = String(easeOut(span(frame.t, start + 0.6, start + 1.4)))
  }

  return { render }
}
