// A runtime panel's hand-drawn frame: a sketched border drawn on when the narration introduces
// the panel, its title written in, and a hand-drawn underline when the narration focuses it.
import type { FocusTarget, LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../film-clock'
import type { Rect } from '../layout'
import { easeOut, span } from '../lib/ease'
import { el, place, setStroke, setText, svgEl } from '../lib/dom'
import { sketchRect, sketchUnderline } from '../lib/sketch'

export interface PanelFrame {
  body: HTMLDivElement
  /** 0 before the panel is introduced, 1 once drawn; also the panel's opacity outside the why/recap dim. */
  presence(frame: FrameInfo): number
  render(frame: FrameInfo): void
}

/** When the panel first appears: its overview beat, else the start of the overview scene. */
export function revealTime(plan: LessonPlan, clock: FilmClock, target: FocusTarget): number {
  const beat = plan.beats.find((b) => b.scene === 'overview' && b.focus === target)
  return beat ? clock.beatStart(beat.id) + 0.2 : clock.sceneStart('overview') + 0.3
}

/** Runtime panels make room for the why board and leave for the recap. */
export function runtimeDim(frame: FrameInfo, clock: FilmClock): number {
  const why = span(frame.t, clock.sceneStart('why'), clock.sceneStart('why') + 0.8)
  const recap = span(frame.t, clock.sceneStart('recap'), clock.sceneStart('recap') + 0.7)
  return 1 - why * 0.82 - recap * 0.18
}

export function createPanelFrame(
  stage: HTMLElement,
  strokes: SVGSVGElement,
  plan: LessonPlan,
  clock: FilmClock,
  target: FocusTarget,
  rect: Rect,
  title: string,
  concept: string,
): PanelFrame {
  const root = el('div', `panel panel-${concept}`, stage)
  root.style.width = `${rect.w}px`
  root.style.height = `${rect.h}px`
  const head = el('div', 'panel-head', root)
  const titleEl = el('div', 'panel-title', head)
  setText(titleEl, title)
  const body = el('div', 'panel-body', root)
  const border = svgEl('path', { class: `stroke stroke-${concept}` }, strokes)
  const border2 = svgEl('path', { class: `stroke stroke-${concept} stroke-faint` }, strokes)
  const underline = svgEl('path', { class: 'stroke stroke-accent stroke-thick' }, strokes)
  const shown = revealTime(plan, clock, target)
  const d1 = sketchRect(`${target}-a`, rect.x, rect.y, rect.w, rect.h)
  const d2 = sketchRect(`${target}-b`, rect.x + 1.5, rect.y - 1, rect.w - 2, rect.h + 1.5)
  const titleWidth = Math.min(rect.w - 48, title.length * 15 + 16)

  const presence = (frame: FrameInfo) => easeOut(span(frame.t, shown, shown + 1.1))

  function render(frame: FrameInfo) {
    const draw = presence(frame)
    const dim = runtimeDim(frame, clock)
    const visible = frame.scene !== 'intro' && draw > 0
    place(root, rect.x, rect.y, visible ? Math.min(1, draw * 1.4) * dim : 0)
    // Body content enters after the frame is mostly drawn.
    body.style.opacity = String(span(draw, 0.5, 1))
    setStroke(border, d1, visible ? draw : 0, dim)
    setStroke(border2, d2, visible ? span(draw, 0.3, 1) : 0, 0.45 * dim)
    // Focus: an underline under the title, drawn while its beat plays.
    const focused = frame.beat.focus === target && frame.scene !== 'why' && frame.scene !== 'recap'
    const u = focused ? easeOut(span(frame.beatTime, 0.15, 0.75)) : 0
    setStroke(underline, sketchUnderline(`${target}-u`, rect.x + 22, rect.y + 50, titleWidth), u, dim)
    root.classList.toggle('is-focused', focused)
  }

  return { body, presence, render }
}
