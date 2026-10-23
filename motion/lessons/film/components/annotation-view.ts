// A step's handwritten note: written beside the focused panel, with a sketched arrow drawn from the
// words to the panel, then left in place until the step ends.
import type { LessonPlan } from '../../lesson-types'
import type { FrameInfo } from '../film-clock'
import { rectOf } from '../layout'
import type { Layout, Rect } from '../layout'
import { easeOut, span } from '../lib/ease'
import { el, place, setStroke, setText, svgEl } from '../lib/dom'
import { sketchArrow } from '../lib/sketch'
import type { Point } from '../lib/sketch'

const NOTE_W = 300

/** Where the note sits relative to its panel: in open space, never over another panel's cards. */
function anchor(target: Rect, layout: Layout): { note: Point; tip: Point } {
  const onRight = target.x >= layout.stack.x
  if (target === layout.console) return { note: { x: target.x + target.w - NOTE_W - 30, y: target.y + target.h - 70 }, tip: { x: target.x + target.w - 120, y: target.y + target.h - 92 } }
  if (target === layout.code) return { note: { x: target.x + target.w - NOTE_W - 20, y: target.y + 6 }, tip: { x: target.x + target.w - 60, y: target.y + 56 } }
  if (!onRight) return { note: { x: target.x + 40, y: target.y + target.h - 60 }, tip: { x: target.x + 80, y: target.y + target.h - 80 } }
  // A narrow panel (the call stack) has no room beside its title: the note goes just under it,
  // where the stack's top area is empty (frames grow from the bottom).
  if (target.w < 500) {
    const note = { x: target.x + target.w - NOTE_W - 22, y: target.y + 62 }
    // Tip next to the words: the arrow is skipped, the note already sits on what it names.
    return { note, tip: { x: note.x + 24, y: note.y + 50 } }
  }
  // Right-hand panels: the note sits in the panel's own header strip, right-aligned, pointing down into it.
  return { note: { x: target.x + target.w - NOTE_W - 24, y: target.y + 8 }, tip: { x: target.x + target.w - 180, y: target.y + 60 } }
}

export function createAnnotationView(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, layout: Layout) {
  const note = el('div', 'note hand', stage)
  note.style.width = `${NOTE_W}px`
  const shaft = svgEl('path', { class: 'stroke stroke-note' }, strokes)
  const head = svgEl('path', { class: 'stroke stroke-note' }, strokes)

  function render(frame: FrameInfo) {
    const text = frame.beat.note
    const target = frame.beat.focus && rectOf(layout, frame.beat.focus)
    if (!text || !target || frame.scene !== 'execute') {
      place(note, 0, 0, 0)
      setStroke(shaft, '', 0)
      setStroke(head, '', 0)
      return
    }
    const { note: at, tip } = anchor(target, layout)
    // Written after the first move lands, so the eye goes to the move first and the note second.
    const write = easeOut(span(frame.t, frame.timing.speech + 0.8, frame.timing.speech + 1.7))
    setText(note, text)
    place(note, at.x, at.y, write > 0 ? 1 : 0)
    note.style.clipPath = `inset(-10px ${((1 - write) * 100).toFixed(1)}% -10px -10px)`
    const from = { x: at.x + 20, y: at.y + 44 }
    if (Math.hypot(tip.x - from.x, tip.y - from.y) < 50) {
      setStroke(shaft, '', 0)
      setStroke(head, '', 0)
      return
    }
    const arrow = sketchArrow(`note-${frame.beat.id}`, from, tip, 26)
    setStroke(shaft, arrow.shaft, span(frame.t, frame.timing.speech + 1.4, frame.timing.speech + 2.0))
    setStroke(head, arrow.head, span(frame.t, frame.timing.speech + 1.9, frame.timing.speech + 2.1))
  }

  return { render }
}
