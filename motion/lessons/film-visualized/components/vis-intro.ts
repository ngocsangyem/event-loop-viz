// Scene 1, quiz first: the lesson name in a chip, the question as a bold headline, the Script
// large in the middle (drawn by the code card) and, once the question is asked, one "?" chip per
// line the console will print. The answer is not shown until the recap.
import type { LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../../film/film-clock'
import { easeOut, lerp, span } from '../../film/lib/ease'
import { el, place } from '../../film/lib/dom'
import type { VisLayout } from '../vis-layout'
import { INTRO_CODE_Y, introScale } from './vis-code-card'

export function createVisIntro(stage: HTMLElement, plan: LessonPlan, clock: FilmClock, layout: VisLayout) {
  const root = el('div', 'v-intro', stage)
  const kicker = el('div', 'v-kicker', root)
  kicker.textContent = plan.title
  const heading = el('div', 'v-headline', root)
  heading.textContent = plan.question
  const strip = el('div', 'v-window v-blanks', root)
  el('div', 'v-console-title', strip).textContent = 'console'
  const row = el('div', 'v-blank-row', strip)
  const blanks = plan.output.map(() => {
    const b = el('div', 'v-blank', row)
    b.textContent = '?'
    return b
  })
  const stripY = INTRO_CODE_Y + layout.code.h * introScale(layout) + 34
  const asked = clock.beatStart('intro-2')

  function render(frame: FrameInfo) {
    const overview = clock.sceneStart('overview')
    const leave = easeOut(span(frame.t, overview, overview + 0.6))
    place(root, 0, 0, 1 - leave)
    const k = easeOut(span(frame.t, 0.1, 0.8))
    place(kicker, 960, 70 + lerp(12, 0, k), k, ' translateX(-50%)')
    const h = easeOut(span(frame.t, 0.35, 1.1))
    place(heading, 960, 128 + lerp(16, 0, h), h, ' translateX(-50%)')
    const s = easeOut(span(frame.t, asked, asked + 0.6))
    place(strip, 960, stripY + lerp(14, 0, s), s, ' translateX(-50%)')
    blanks.forEach((b, i) => {
      const at = asked + 0.5 + i * 0.18
      b.style.opacity = String(easeOut(span(frame.t, at, at + 0.35)))
    })
  }

  return { render }
}
