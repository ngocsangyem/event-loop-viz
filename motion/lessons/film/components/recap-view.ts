// Scene 5: the final output order (the answer to the opening question), the takeaways, and the
// mental model in a hand-drawn box, written in as the voice reaches each part.
import type { LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../film-clock'
import { easeOut, lerp, span } from '../lib/ease'
import { el, place, setStroke, svgEl } from '../lib/dom'
import { sketchRect, sketchUnderline } from '../lib/sketch'

const LEFT = { x: 96, y: 120, w: 700 }
const RIGHT = { x: 880, y: 120, w: 944 }

export function createRecapView(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, clock: FilmClock) {
  const root = el('div', 'recap', stage)
  const outHead = el('div', 'recap-head', root)
  outHead.textContent = plan.labels.output!
  const outRows = plan.output.map((text, i) => {
    const row = el('div', 'recap-out', root)
    el('span', 'recap-out-num', row).textContent = String(i + 1).padStart(2, '0')
    el('span', 'recap-out-text', row).textContent = text
    return row
  })
  const keyHead = el('div', 'recap-head', root)
  keyHead.textContent = plan.labels.takeaways!
  const keys = plan.takeaways.map((text) => {
    const row = el('div', 'recap-key', root)
    row.textContent = text
    return row
  })
  const modelHead = el('div', 'recap-head hand-head', root)
  modelHead.textContent = plan.labels.model!
  const model = el('div', 'recap-model', root)
  model.textContent = plan.model
  const lineOut = svgEl('path', { class: 'stroke stroke-console stroke-thick' }, strokes)
  const lineKey = svgEl('path', { class: 'stroke stroke-ink stroke-thick' }, strokes)
  const box = svgEl('path', { class: 'stroke stroke-accent stroke-thick' }, strokes)
  const box2 = svgEl('path', { class: 'stroke stroke-accent stroke-faint' }, strokes)

  const rowH = Math.min(64, 620 / Math.max(1, plan.output.length))
  const keyY = RIGHT.y + 78
  const modelY = 640

  function render(frame: FrameInfo) {
    const start = clock.sceneStart('recap')
    const second = clock.beatStart('recap-2')
    const on = frame.scene === 'recap' ? 1 : 0
    place(root, 0, 0, on)
    if (!on) {
      for (const p of [lineOut, lineKey, box, box2]) setStroke(p, '', 0)
      return
    }
    place(outHead, LEFT.x, LEFT.y, easeOut(span(frame.t, start + 0.4, start + 1)))
    setStroke(lineOut, sketchUnderline('recap-out', LEFT.x, LEFT.y + 56, 300), span(frame.t, start + 0.6, start + 1.2))
    // Output rows land one by one as the voice reads the order.
    const first = clock.timingOf('recap-1')
    const reading = (first?.speechDuration ?? 6) * 0.85
    outRows.forEach((row, i) => {
      const at = Math.min((first?.speech ?? start) + 0.6 + (i / plan.output.length) * reading, second - 0.5)
      const p = easeOut(span(frame.t, at, at + 0.5))
      place(row, LEFT.x + lerp(-20, 0, p), LEFT.y + 86 + i * rowH, p)
    })
    place(keyHead, RIGHT.x, RIGHT.y, easeOut(span(frame.t, start + 0.8, start + 1.4)))
    setStroke(lineKey, sketchUnderline('recap-key', RIGHT.x, RIGHT.y + 56, 260), span(frame.t, start + 1, start + 1.6))
    keys.forEach((row, i) => {
      const at = start + 1.6 + i * 1.6
      const p = easeOut(span(frame.t, at, at + 0.6))
      row.style.width = `${RIGHT.w}px`
      place(row, RIGHT.x + lerp(-20, 0, p), keyY + i * 120, p)
    })
    const m = easeOut(span(frame.t, second, second + 1.2))
    place(modelHead, RIGHT.x + 24, modelY - 8, m)
    model.style.width = `${RIGHT.w - 64}px`
    place(model, RIGHT.x + 32, modelY + 54, easeOut(span(frame.t, second + 0.6, second + 1.4)))
    setStroke(box, sketchRect('recap-model', RIGHT.x, modelY - 24, RIGHT.w, 230, 3), m)
    setStroke(box2, sketchRect('recap-model-2', RIGHT.x + 4, modelY - 20, RIGHT.w - 6, 224, 3), span(m, 0.4, 1), 0.5)
  }

  return { render }
}
