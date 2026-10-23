// Runtime panels of the visualized style: rounded boxes with a thick gradient border in the
// part's colour and a grey title chip sitting on the top edge. The Event Loop is a narrow column
// with a cycle icon that turns each time the loop moves work, and the phase it is in under it.
import type { FocusTarget, LessonPlan, LessonSnapshot } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../../film/film-clock'
import { easeInOut, span } from '../../film/lib/ease'
import { el, place, setText, svgEl } from '../../film/lib/dom'
import type { Rect, VisLayout } from '../vis-layout'
import type { Spotlight } from '../vis-focus'

export interface VisPanel {
  part: FocusTarget
  rect: Rect
}

function shell(stage: HTMLElement, rect: Rect, title: string, concept: string) {
  const root = el('div', `v-panel v-panel-${concept}`, stage)
  Object.assign(root.style, { width: `${rect.w}px`, height: `${rect.h}px` })
  const chip = el('div', 'v-chip', root)
  setText(chip, title)
  return { root, chip }
}

/** Times the loop turns: whenever it changes phase or takes a callback from a queue. */
function spinsOf(plan: LessonPlan, clock: FilmClock) {
  const spins: { start: number; end: number }[] = []
  let settled: LessonSnapshot = plan.snapshots[0]!
  for (const beat of plan.beats) {
    if (beat.scene === 'execute') {
      const moves = clock.timingOf(beat.id)?.moves ?? []
      beat.keyframes.forEach((kf, k) => {
        const from = k === 0 ? settled : plan.snapshots[beat.keyframes[k - 1]!]!
        const to = plan.snapshots[kf]!
        if (moves[k] && (from.phase !== to.phase || (to.picked && !from.picked))) spins.push(moves[k]!)
      })
    }
    settled = plan.snapshots[beat.keyframes[beat.keyframes.length - 1] ?? 0]!
  }
  return spins
}

export function createVisPanels(stage: HTMLElement, plan: LessonPlan, clock: FilmClock, layout: VisLayout, spot: Spotlight) {
  const L = plan.labels
  const defs: [FocusTarget, Rect | undefined, string, string][] = [
    ['stack', layout.stack, L.callStack!, 'stack'],
    ['webApis', layout.webApis, L.webApis!, 'webapi'],
    ['tasks', layout.tasks, L.tasks!, 'task'],
    ['microtasks', layout.microtasks, L.microtasks!, 'job'],
  ]
  const panels = defs.filter((d) => d[1]).map(([part, rect, title, concept]) => ({ part, rect: rect!, ...shell(stage, rect!, title, concept) }))

  const loop = shell(stage, layout.loop, L.loop!, 'loop')
  const svg = svgEl('svg', { class: 'v-cycle', width: 120, height: 120, viewBox: '-60 -60 120 120' }, loop.root)
  const grad = svgEl('linearGradient', { id: 'v-cycle-grad', x1: 0, y1: 0, x2: 1, y2: 1 }, svgEl('defs', {}, svg))
  svgEl('stop', { offset: 0, 'stop-color': '#5eead4' }, grad)
  svgEl('stop', { offset: 1, 'stop-color': '#38bdf8' }, grad)
  const icon = svgEl('g', {}, svg)
  for (const a of [0, Math.PI]) {
    const r = 34
    const a0 = a + 0.35
    const a1 = a + Math.PI - 0.35
    const p = (t: number) => `${(Math.cos(t) * r).toFixed(1)},${(Math.sin(t) * r).toFixed(1)}`
    svgEl('path', { d: `M${p(a0)} A${r},${r} 0 0 1 ${p(a1)}`, class: 'v-cycle-arc' }, icon)
    // Arrowhead at the end of the arc, pointing clockwise.
    const hx = Math.cos(a1) * r
    const hy = Math.sin(a1) * r
    const tx = -Math.sin(a1)
    const ty = Math.cos(a1)
    const nx = Math.cos(a1)
    const ny = Math.sin(a1)
    svgEl('path', { d: `M${hx + nx * 13},${hy + ny * 13} L${hx + tx * 14},${hy + ty * 14} L${hx - nx * 13},${hy - ny * 13} Z`, class: 'v-cycle-head' }, icon)
  }
  const phase = el('div', 'v-phase', loop.root)
  const spins = spinsOf(plan, clock)
  const phaseText: Record<string, string> = {
    idle: L.phaseIdle!,
    task: L.phaseTask!,
    microtasks: L.phaseMicrotasks!,
    render: L.phaseRender!,
    halted: L.phaseHalted!,
  }

  function render(frame: FrameInfo) {
    for (const p of panels) {
      place(p.root, p.rect.x, p.rect.y, spot(frame, p.part))
      p.chip.classList.toggle('is-focused', frame.scene === 'execute' && frame.beat.focus === p.part)
    }
    place(loop.root, layout.loop.x, layout.loop.y, spot(frame, 'loop'))
    loop.chip.classList.toggle('is-focused', frame.scene === 'execute' && frame.beat.focus === 'loop')
    const turned = spins.reduce((sum, s) => sum + 180 * easeInOut(span(frame.t, s.start, s.end)), 0)
    icon.setAttribute('transform', `rotate(${turned.toFixed(2)})`)
    const shown = frame.scene === 'execute' ? (frame.p > 0.5 ? frame.to : frame.from).phase : null
    setText(phase, shown ? phaseText[shown]! : '')
  }

  return { render, panels }
}
