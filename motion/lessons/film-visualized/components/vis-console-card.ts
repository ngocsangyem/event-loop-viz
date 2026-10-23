// The console as its own dark card with a small "console" title. A printed line appears in one
// piece at the moment its console.log frame is on the stack (no typing), in the string colour.
import type { LessonPlan } from '../../lesson-types'
import type { FrameInfo } from '../../film/film-clock'
import { easeOut, lerp, span } from '../../film/lib/ease'
import { el, place, setText } from '../../film/lib/dom'
import type { VisLayout } from '../vis-layout'
import type { Spotlight } from '../vis-focus'

const ROW_H = 44

export function createVisConsoleCard(stage: HTMLElement, plan: LessonPlan, layout: VisLayout, spot: Spotlight) {
  const r = layout.console
  const root = el('div', 'v-window v-console', stage)
  Object.assign(root.style, { width: `${r.w}px`, height: `${r.h}px` })
  el('div', 'v-console-title', root).textContent = 'console'
  const body = el('div', 'v-console-body', root)
  const textW = r.w - 68
  const capacity = Math.max(1, Math.floor((r.h - 90) / ROW_H))
  const most = Math.max(0, ...plan.snapshots.map((s) => s.console.length))
  const rows = Array.from({ length: Math.min(most, capacity) }, () => el('div', 'v-console-row', body))

  function render(frame: FrameInfo) {
    place(root, r.x, r.y, spot(frame, 'console'))
    const before = frame.from.console
    const after = frame.to.console
    const first = Math.max(0, after.length - capacity)
    rows.forEach((row, i) => {
      const index = first + i
      const line = after[index]
      if (!line) {
        row.style.opacity = '0'
        return
      }
      const isNew = index >= before.length
      const s = isNew ? easeOut(span(frame.p, 0.3, 0.6)) : 1
      setText(row, line.text)
      // Long lines shrink to fit on one row (JetBrains Mono advances 0.6 em).
      row.style.fontSize = `${Math.min(27, Math.floor(textW / (line.text.length * 0.6)))}px`
      row.dataset.level = line.level
      row.style.opacity = String(s)
      row.style.transform = `translateY(${lerp(8, 0, s).toFixed(1)}px)`
    })
  }

  return { render }
}
