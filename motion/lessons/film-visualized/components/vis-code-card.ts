// The Script as an editor window (traffic lights, gutter). In the intro it sits large in the
// middle under the question; when the runtime appears it moves to its place on the left. The line
// running now gets a solid green bar that jumps with execution, and once the Script's own Task has
// finished the whole window dims, so only the callback lines that still run light up.
import type { LessonPlan, LessonSnapshot } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../../film/film-clock'
import { easeInOut, easeOut, lerp, span } from '../../film/lib/ease'
import { el, place } from '../../film/lib/dom'
import type { VisLayout } from '../vis-layout'
import type { Spotlight } from '../vis-focus'
import { visHighlight } from '../vis-syntax'

export const INTRO_CODE_Y = 300

export function introScale(layout: VisLayout) {
  return Math.min(1.3, 500 / layout.code.h)
}

export function createVisCodeCard(stage: HTMLElement, plan: LessonPlan, clock: FilmClock, layout: VisLayout, spot: Spotlight) {
  const r = layout.code
  const root = el('div', 'v-window v-code', stage)
  Object.assign(root.style, { width: `${r.w}px`, height: `${r.h}px` })
  const dots = el('div', 'v-dots', root)
  for (const c of ['r', 'y', 'g']) el('span', `v-dot v-dot-${c}`, dots)
  const body = el('div', 'v-code-body', root)
  body.style.setProperty('--row', `${layout.codeRow}px`)
  body.style.setProperty('--code-font', `${layout.codeFont}px`)
  const bar = el('div', 'v-line-bar', body)
  const rows = plan.code.map((row) => {
    const line = el('div', 'v-code-row', body)
    el('span', 'v-gutter', line).textContent = row.number === null ? '' : String(row.number)
    el('span', 'v-code-text', line).innerHTML = visHighlight(row.text)
    return line
  })

  // The Script's Task is over once no snapshot later shows its frame.
  const lastScript = Math.max(-Infinity, ...plan.snapshots.filter((s) => s.stack.some((f) => f.kind === 'script')).map((s) => s.position))
  const done = (s: LessonSnapshot) => (s.position > lastScript ? 1 : 0)

  const rowsOf = (line: number | null) => {
    if (line === null) return []
    return plan.code.flatMap((row, i) => (row.sourceLine === line ? [i] : []))
  }

  const scale = introScale(layout)
  const introX = 960 - (r.w * scale) / 2

  function render(frame: FrameInfo) {
    const overview = clock.sceneStart('overview')
    const k = easeInOut(span(frame.t, overview, overview + 1.1))
    const appear = easeOut(span(frame.t, 0.3, 1.1))
    const s = lerp(scale, 1, k)
    const opacity = frame.scene === 'intro' ? appear : lerp(1, spot(frame, 'code'), k)
    place(root, lerp(introX, r.x, k), lerp(INTRO_CODE_Y, r.y, k), opacity, ` scale(${s.toFixed(4)})`)

    const live = frame.scene === 'execute'
    const line = live ? (frame.p < 0.2 ? frame.from.line : frame.to.line) : null
    const lit = rowsOf(line)
    const dim = live ? lerp(done(frame.from), done(frame.to), frame.p) : 0
    rows.forEach((row, i) => {
      // Rows are written in one by one at the very start.
      const write = easeOut(span(frame.t, 0.9 + i * 0.1, 1.3 + i * 0.1))
      row.classList.toggle('is-lit', lit.includes(i))
      row.style.opacity = String(write * (lit.includes(i) ? 1 : lerp(1, 0.28, dim)))
    })
    if (lit.length === 0) {
      bar.style.opacity = '0'
      return
    }
    bar.style.opacity = '1'
    bar.style.transform = `translateY(${(lit[0]! * layout.codeRow).toFixed(1)}px)`
    bar.style.height = `${lit.length * layout.codeRow}px`
  }

  return { render }
}
