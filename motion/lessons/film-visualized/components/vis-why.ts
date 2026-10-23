// Scene 4: a "Why this order?" card takes the console's place while the runtime part each reason
// is about is spotlit. Reasons are added one by one; the one being explained stays bright. The
// final output runs along the bottom so the reasons stay tied to what was printed.
import type { LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../../film/film-clock'
import { easeOut, lerp, span } from '../../film/lib/ease'
import { el, place } from '../../film/lib/dom'
import type { VisLayout } from '../vis-layout'

export function createVisWhy(stage: HTMLElement, plan: LessonPlan, clock: FilmClock, layout: VisLayout) {
  const r = layout.console
  const root = el('div', 'v-window v-why', stage)
  Object.assign(root.style, { width: `${r.w}px`, height: `${r.h}px` })
  el('div', 'v-why-title', root).textContent = plan.labels.why!
  const list = el('div', 'v-why-list', root)
  const beats = plan.beats.filter((b) => b.scene === 'why')
  const points = beats.map((beat, i) => {
    const row = el('div', 'v-why-point', list)
    el('div', 'v-why-num', row).textContent = String(i + 1)
    el('div', 'v-why-text', row).textContent = beat.title ?? ''
    return { beat, row }
  })
  const strip = el('div', 'v-why-output', root)
  plan.output.forEach((text) => {
    el('span', 'v-out-chip', strip).textContent = text
  })

  function render(frame: FrameInfo) {
    const start = clock.sceneStart('why')
    const recap = clock.sceneStart('recap')
    const on = easeOut(span(frame.t, start, start + 0.6)) * (1 - easeOut(span(frame.t, recap, recap + 0.6)))
    place(root, r.x, r.y + lerp(16, 0, on), on)
    points.forEach(({ beat, row }) => {
      const at = clock.beatStart(beat.id) + 0.15
      const p = easeOut(span(frame.t, at, at + 0.5))
      const current = frame.beat.id === beat.id
      row.style.opacity = String(p * (current ? 1 : 0.4))
      row.style.transform = `translateX(${lerp(-16, 0, p).toFixed(1)}px)`
      row.classList.toggle('is-current', current)
    })
  }

  return { render }
}
