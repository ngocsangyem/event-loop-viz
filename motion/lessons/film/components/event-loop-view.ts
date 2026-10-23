// The event loop as a hand-drawn cycle with its stations: one Task, then the microtask checkpoint
// (and a rendering step when the lesson has one). The accent marker travels clockwise to the
// station the loop is in, and only moves when the Trace says the phase changed: the loop never
// "runs beside" the stack, it takes its turn when the stack is empty.
import type { LessonPlan, LoopPhase } from '../../lesson-types'
import type { FrameInfo } from '../film-clock'
import { loopGeometry } from '../layout'
import type { Layout } from '../layout'
import { easeInOut, lerp } from '../lib/ease'
import { el, place, setStroke, setText, svgEl } from '../lib/dom'
import { sketchEllipse } from '../lib/sketch'

/** Station angles, clockwise from the top (radians, screen coordinates). */
const ANGLE: Record<LoopPhase, number> = {
  idle: -Math.PI / 2,
  task: Math.PI,
  microtasks: 0,
  render: Math.PI / 2,
  halted: -Math.PI / 2,
}

export function createEventLoopView(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, layout: Layout) {
  const r = layout.loop
  const { radius, cx, cy, textX, textW } = loopGeometry(layout)
  const hasRender = plan.snapshots.some((s) => s.phase === 'render')
  const ring = svgEl('path', { class: 'stroke stroke-ink stroke-loop' }, strokes)
  const ringHead = svgEl('path', { class: 'stroke stroke-ink stroke-loop' }, strokes)
  const ringD = sketchEllipse('loop-ring', cx, cy, radius, radius, 0.9)
  // Arrowhead at the end of the 0.9 turn, pointing clockwise.
  const endA = -Math.PI / 2 + 0.9 * 2 * Math.PI + Math.PI * 0.2
  const hx = cx + Math.cos(endA) * radius
  const hy = cy + Math.sin(endA) * radius
  const tangent = endA + Math.PI / 2
  const headD = `M${hx - Math.cos(tangent - 0.5) * 16},${hy - Math.sin(tangent - 0.5) * 16} L${hx},${hy} L${hx - Math.cos(tangent + 0.5) * 16},${hy - Math.sin(tangent + 0.5) * 16}`

  const wrap = el('div', 'loop-view', stage)
  const station = (text: string, cls: string) => {
    const node = el('div', `loop-station ${cls}`, wrap)
    setText(node, text)
    return node
  }
  const sTask = station(plan.labels.loopTask!, 'is-task')
  const sMicro = station(plan.labels.loopMicrotasks!, 'is-micro')
  const sRender = hasRender ? station('render', 'is-render') : null
  const dot = el('div', 'loop-dot', wrap)
  const phase = el('div', 'loop-phase', wrap)
  const clockEl = el('div', 'loop-clock', wrap)

  const phaseText = (p: LoopPhase) =>
    ({ idle: plan.labels.phaseIdle, task: plan.labels.phaseTask, microtasks: plan.labels.phaseMicrotasks, render: plan.labels.phaseRender, halted: plan.labels.phaseHalted })[p]!

  /** Clockwise angle from a to b, so the marker only ever goes forward around the loop. */
  const forward = (a: number, b: number) => {
    let d = b - a
    while (d < 0) d += Math.PI * 2
    return d
  }

  function render(frame: FrameInfo, presence: number, dim: number) {
    const visible = presence * dim
    setStroke(ring, ringD, presence, dim)
    setStroke(ringHead, headD, presence > 0.95 ? 1 : 0, dim)
    place(wrap, 0, 0, visible)
    // Station tags sit on the ring; the one the loop is in turns accent ("now").
    place(sTask, cx - radius, cy, 1, ' translate(-50%, -50%)')
    place(sMicro, cx + radius, cy, 1, ' translate(-50%, -50%)')
    if (sRender) place(sRender, cx, cy + radius, 1, ' translate(-50%, -50%)')
    const a0 = ANGLE[frame.from.phase]
    const turn = forward(a0, ANGLE[frame.to.phase])
    const angle = a0 + turn * easeInOut(frame.p)
    // The marker shows while travelling and while waiting at the top; at a station its tag lights up instead.
    const resting = frame.p >= 1 || turn === 0
    const atStation = resting && frame.to.phase !== 'idle'
    place(dot, cx + Math.cos(angle) * radius - 11, cy + Math.sin(angle) * radius - 11, atStation ? 0 : frame.to.phase === 'halted' ? 0.35 : 1)
    sTask.classList.toggle('is-active', frame.to.phase === 'task' && frame.p > 0.5)
    sMicro.classList.toggle('is-active', frame.to.phase === 'microtasks' && frame.p > 0.5)
    sRender?.classList.toggle('is-active', frame.to.phase === 'render' && frame.p > 0.5)
    const current = frame.p > 0.5 ? frame.to : frame.from
    setText(phase, frame.scene === 'overview' ? '' : phaseText(current.phase))
    place(phase, textX, r.y + 66, 1)
    phase.style.width = `${textW}px`
    const ms = lerp(frame.from.clockMs, frame.to.clockMs, frame.p)
    setText(clockEl, frame.scene === 'overview' ? '' : `${plan.labels.clock} ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms`)
    place(clockEl, textX, r.y + 66 + 62, 1)
  }

  return { render }
}
