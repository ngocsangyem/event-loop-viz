// Scene 1: the lesson's name, the Script on the left and the question in the teacher's hand on the
// right, with one blank console slot per line the Script will print. The answer is not shown.
import type { LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../film-clock'
import type { Layout } from '../layout'
import { easeOut, lerp, span } from '../lib/ease'
import { el, place, setStroke, svgEl } from '../lib/dom'
import { sketchUnderline } from '../lib/sketch'

export function createIntroView(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, clock: FilmClock, layout: Layout) {
  const x = layout.stack.x + 20
  const w = 1864 - x
  const root = el('div', 'intro', stage)
  root.style.width = `${w}px`
  const title = el('div', 'intro-title', root)
  title.textContent = plan.title
  const question = el('div', 'intro-question hand', root)
  question.textContent = plan.question
  const blanks = el('div', 'intro-blanks', root)
  const slots = plan.output.map((_, i) => {
    const slot = el('div', 'intro-blank', blanks)
    slot.textContent = `${i + 1}.  ?`
    return slot
  })
  const underline = svgEl('path', { class: 'stroke stroke-accent stroke-thick' }, strokes)
  const underlineD = sketchUnderline('intro-title', x, 232, Math.min(w - 40, plan.title.length * 30))
  const questionAt = clock.beatStart('intro-2')

  function render(frame: FrameInfo) {
    const leave = easeOut(span(frame.t, clock.sceneStart('overview'), clock.sceneStart('overview') + 0.8))
    const inTitle = easeOut(span(frame.t, 0.4, 1.4))
    place(root, x + leave * -40, 150, (1 - leave) * Math.min(1, inTitle * 1.3))
    title.style.transform = `translateY(${lerp(18, 0, inTitle).toFixed(1)}px)`
    setStroke(underline, underlineD, span(frame.t, 1.2, 2.0), 1 - leave)
    const q = easeOut(span(frame.t, questionAt, questionAt + 0.9))
    question.style.opacity = String(q)
    question.style.clipPath = `inset(0 ${((1 - q) * 100).toFixed(1)}% 0 0)`
    slots.forEach((slot, i) => {
      const at = questionAt + 1 + i * 0.25
      const s = easeOut(span(frame.t, at, at + 0.4))
      slot.style.opacity = String(s)
      slot.style.transform = `translateY(${lerp(10, 0, s).toFixed(1)}px)`
    })
  }

  return { render }
}
