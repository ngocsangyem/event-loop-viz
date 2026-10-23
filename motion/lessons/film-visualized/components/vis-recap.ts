// Scene 5: the answer to the opening question as a big console line, revealed in step with the
// voice reading it, then the takeaways, then the mental model in a gradient-bordered box.
import type { LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../../film/film-clock'
import { easeOut, lerp, span } from '../../film/lib/ease'
import { el, place } from '../../film/lib/dom'

export function createVisRecap(stage: HTMLElement, plan: LessonPlan, clock: FilmClock) {
  const root = el('div', 'v-recap', stage)
  const outChip = el('div', 'v-kicker', root)
  outChip.textContent = plan.labels.output!
  const answer = el('div', 'v-window v-answer', root)
  el('div', 'v-console-title', answer).textContent = 'console'
  const row = el('div', 'v-answer-row', answer)
  const outs = plan.output.map((text) => {
    const chip = el('span', 'v-answer-out', row)
    chip.textContent = text
    return chip
  })
  const keyChip = el('div', 'v-kicker', root)
  keyChip.textContent = plan.labels.takeaways!
  const keys = plan.takeaways.map((text) => {
    const k = el('div', 'v-takeaway', root)
    k.textContent = text
    return k
  })
  const model = el('div', 'v-model', root)
  el('div', 'v-model-label', model).textContent = plan.labels.model!
  el('div', 'v-model-text', model).textContent = plan.model

  function render(frame: FrameInfo) {
    const start = clock.sceneStart('recap')
    if (frame.t < start) {
      place(root, 0, 0, 0)
      return
    }
    place(root, 0, 0, easeOut(span(frame.t, start + 0.3, start + 0.9)))
    place(outChip, 960, 64, 1, ' translateX(-50%)')
    place(answer, 960, 112, 1, ' translateX(-50%)')
    const first = clock.timingOf('recap-1')
    const second = clock.beatStart('recap-2')
    const reading = (first?.speechDuration ?? 6) * 0.85
    outs.forEach((chip, i) => {
      const at = Math.min((first?.speech ?? start) + 0.5 + (i / outs.length) * reading, second - 0.5)
      const p = easeOut(span(frame.t, at, at + 0.35))
      chip.style.opacity = String(p)
      chip.style.transform = `translateY(${lerp(10, 0, p).toFixed(1)}px)`
    })
    const keyStart = start + 1.4
    place(keyChip, 960, 372, easeOut(span(frame.t, keyStart, keyStart + 0.5)), ' translateX(-50%)')
    keys.forEach((k, i) => {
      const at = keyStart + 0.4 + i * 1.2
      const p = easeOut(span(frame.t, at, at + 0.5))
      place(k, 960, 430 + i * 96 + lerp(12, 0, p), p, ' translateX(-50%)')
    })
    const m = easeOut(span(frame.t, second, second + 0.8))
    place(model, 960, 760 + lerp(18, 0, m), m, ' translateX(-50%)')
  }

  return { render }
}
