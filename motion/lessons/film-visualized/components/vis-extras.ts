// State the cards do not carry: the purple hand-off tab on the Web APIs edge while the browser
// works on something, an "EMPTY" chip in an empty Call Stack, async functions parked at an await,
// and the step's short note as a white pill on the panel the narration is about.
import type { LessonPlan } from '../../lesson-types'
import type { FrameInfo } from '../../film/film-clock'
import { easeOut, lerp, span } from '../../film/lib/ease'
import { el, place, setText } from '../../film/lib/dom'
import type { Rect, VisLayout } from '../vis-layout'
import type { Spotlight } from '../vis-focus'

export function createVisExtras(stage: HTMLElement, plan: LessonPlan, layout: VisLayout, spot: Spotlight) {
  const wrap = el('div', 'v-extras', stage)
  const tab = el('div', 'v-handoff', wrap)
  tab.textContent = '→'
  const empty = el('div', 'v-empty', wrap)
  empty.textContent = `${(plan.labels.empty ?? 'empty').toUpperCase()}!`
  const most = Math.max(0, ...plan.snapshots.map((s) => s.parked.length))
  const parked = Array.from({ length: most }, () => el('div', 'v-parked', wrap))
  const note = el('div', 'v-note', wrap)

  /** Where a note goes: top right inside the panel, or just above the narrow loop column. */
  function noteSpot(rect: Rect, focus: string, width: number) {
    if (focus === 'loop') return { x: rect.x, y: rect.y - 54 }
    const inQueue = focus === 'tasks' || focus === 'microtasks'
    return { x: rect.x + rect.w - width - 22, y: rect.y + (inQueue ? 14 : 40) }
  }

  function render(frame: FrameInfo) {
    const live = frame.scene === 'execute'
    const web = layout.webApis
    if (web) {
      const busy = (s: FrameInfo['to']) => (s.webApis.length > 0 ? 1 : 0)
      const on = live ? lerp(busy(frame.from), busy(frame.to), frame.p) * spot(frame, 'webApis') : 0
      place(tab, web.x + web.w - 2, web.y + 110, on)
    } else place(tab, 0, 0, 0)

    const s = layout.stack
    const isEmpty = (snap: FrameInfo['to']) => (snap.stack.length === 0 && !snap.picked ? 1 : 0)
    const e = live ? lerp(isEmpty(frame.from), isEmpty(frame.to), frame.p) : 0
    place(empty, s.x + s.w / 2, s.y + s.h - 60, e * spot(frame, 'stack'), ' translateX(-50%)')

    const list = frame.p > 0.5 ? frame.to.parked : frame.from.parked
    parked.forEach((node, i) => {
      const label = list[i]
      setText(node, label ? `⏸ ${label} · ${plan.labels.parked}` : '')
      node.style.width = `${s.w - 44}px`
      place(node, s.x + 22, s.y + 44 + i * 50, label && (live || frame.scene === 'why') ? spot(frame, 'stack') : 0)
    })

    const focus = frame.beat.focus
    const rect = focus ? layout[focus] : undefined
    if (!frame.beat.note || !rect || !live) {
      place(note, 0, 0, 0)
      return
    }
    setText(note, frame.beat.note)
    const width = note.offsetWidth
    const at = noteSpot(rect, focus!, width)
    const inP = easeOut(span(frame.t, frame.timing.speech, frame.timing.speech + 0.4))
    const out = 1 - span(frame.t, frame.timing.end - 0.3, frame.timing.end)
    place(note, at.x, at.y + lerp(10, 0, inP), inP * out)
  }

  return { render }
}
