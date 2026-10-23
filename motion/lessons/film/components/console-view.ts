// Console output: each new line is typed in while the move that prints it plays.
import type { ConsoleRow, LessonPlan } from '../../lesson-types'
import type { FrameInfo } from '../film-clock'
import type { Layout } from '../layout'
import { span } from '../lib/ease'
import { el, setText } from '../lib/dom'
import { consoleRowH, consoleRows } from './item-layer'

export function createConsoleView(body: HTMLElement, plan: LessonPlan, layout: Layout) {
  const capacity = consoleRows(layout)
  const most = Math.max(0, ...plan.snapshots.map((s) => s.console.length))
  const rows = Array.from({ length: Math.min(most, capacity) }, () => {
    const row = el('div', 'console-row', body)
    row.style.height = `${consoleRowH}px`
    return { row, mark: el('span', 'console-mark', row), text: el('span', 'console-text', row) }
  })

  function render(frame: FrameInfo) {
    const before = frame.from.console
    const after = frame.to.console
    const typing = after.length > before.length ? frame.p : 1
    // Long outputs scroll: the newest lines stay in view.
    const first = Math.max(0, after.length - capacity)
    rows.forEach((slot, i) => {
      const index = first + i
      const line: ConsoleRow | undefined = after[index]
      if (!line) {
        slot.row.style.visibility = 'hidden'
        return
      }
      const isNew = index >= before.length
      const shown = isNew ? Math.round(line.text.length * span(typing, 0.25, 0.95)) : line.text.length
      slot.row.style.visibility = isNew && typing < 0.25 ? 'hidden' : 'visible'
      slot.row.dataset.level = line.level
      slot.row.classList.toggle('is-new', isNew || index === after.length - 1)
      setText(slot.mark, line.level === 'error' ? '✕' : '›')
      setText(slot.text, line.text.slice(0, shown))
    })
  }

  return { render }
}
