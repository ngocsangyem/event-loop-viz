// Small state the cards do not carry: "empty" in an empty panel, and the async functions parked at
// an await, drawn as dashed notes under the stack (their frames are off the stack while they wait).
import type { LessonPlan } from '../../lesson-types'
import type { FrameInfo } from '../film-clock'
import type { Layout, Rect } from '../layout'
import { el, place, setStroke, setText, svgEl } from '../lib/dom'
import { sketchRect } from '../lib/sketch'

export function createPanelExtras(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, layout: Layout) {
  const wrap = el('div', 'extras', stage)
  const empties = (['stack', 'webApis', 'microtasks', 'tasks'] as const)
    .map((key) => ({ key, rect: layout[key] as Rect | undefined }))
    .filter((e): e is { key: 'stack' | 'webApis' | 'microtasks' | 'tasks'; rect: Rect } => e.rect !== undefined)
    .map((e) => ({ ...e, node: el('div', 'panel-empty', wrap) }))
  const most = Math.max(0, ...plan.snapshots.map((s) => s.parked.length))
  const parked = Array.from({ length: most }, (_, i) => ({
    node: el('div', 'parked', wrap),
    border: svgEl('path', { class: 'stroke stroke-dashed' }, strokes),
    key: `parked-${i}`,
  }))

  const count = (key: string, s: FrameInfo['to']) =>
    key === 'stack' ? s.stack.length : key === 'webApis' ? s.webApis.length : key === 'microtasks' ? s.jobs.length : s.tasks.length

  function render(frame: FrameInfo, presence: (key: string) => number, dim: number) {
    const live = frame.scene === 'execute' || frame.scene === 'overview'
    for (const e of empties) {
      const empty = count(e.key, frame.to) === 0 && count(e.key, frame.from) === 0
      setText(e.node, plan.labels.empty!)
      const y = e.key === 'microtasks' || e.key === 'tasks' ? e.rect.y + 86 : e.rect.y + e.rect.h / 2 - 12
      place(e.node, e.rect.x + 26, y, empty && live ? 0.9 * presence(e.key) * dim : 0)
    }
    const r = layout.stack
    const list = frame.p > 0.5 ? frame.to.parked : frame.from.parked
    parked.forEach((slot, i) => {
      const label = list[i]
      const y = r.y + r.h - 22 - (list.length - i) * 46
      const box = { x: r.x + 22, y, w: r.w - 44, h: 38 }
      const opacity = label && frame.scene !== 'recap' ? dim : 0
      setText(slot.node, label ? `⏸ ${label} · ${plan.labels.parked}` : '')
      slot.node.style.width = `${box.w}px`
      place(slot.node, box.x, box.y, opacity)
      setStroke(slot.border, sketchRect(slot.key, box.x, box.y, box.w, box.h, 1.4), opacity > 0 ? 1 : 0, opacity * 0.8)
    })
  }

  return { render }
}
