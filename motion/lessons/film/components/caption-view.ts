// Subtitles: the sentence being spoken now. A beat's narration is split into sentences and each
// is shown for its share of the voice, by length, so the words on screen follow the voice.
import type { LessonPlan } from '../../lesson-types'
import type { FrameInfo } from '../film-clock'
import type { Layout } from '../layout'
import { easeOut, span } from '../lib/ease'
import { el, place, setText } from '../lib/dom'

/** Sentences, with very short ones joined to the next so a caption never flashes. */
export function sentencesOf(text: string): string[] {
  const parts = text.match(/[^.!?…]+[.!?…]+["”]?|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text]
  const out: string[] = []
  for (const part of parts) {
    const last = out[out.length - 1]
    if (last !== undefined && last.length < 28) out[out.length - 1] = `${last} ${part}`
    else out.push(part)
  }
  return out
}

export function createCaptionView(stage: HTMLElement, plan: LessonPlan, layout: Layout) {
  const r = layout.caption
  const root = el('div', 'caption', stage)
  Object.assign(root.style, { width: `${r.w}px`, height: `${r.h}px` })
  const text = el('div', 'caption-text', root)
  const split = plan.beats.map((beat) => sentencesOf(beat.say))

  function render(frame: FrameInfo) {
    const sentences = split[frame.beatIndex]!
    const total = sentences.reduce((n, s) => n + s.length, 0)
    // Which sentence the voice is in, by its share of the characters.
    let acc = 0
    let index = sentences.length - 1
    for (let i = 0; i < sentences.length; i++) {
      acc += sentences[i]!.length
      if (frame.speechProgress < acc / total) {
        index = i
        break
      }
    }
    const before = frame.t < frame.timing.speech - 0.1
    const after = frame.t > frame.timing.speech + frame.timing.speechDuration + 0.35
    setText(text, before ? '' : sentences[index]!)
    const appear = easeOut(span(frame.t, frame.timing.speech - 0.1, frame.timing.speech + 0.15))
    place(root, r.x, r.y, before || after ? 0 : appear)
  }

  return { render }
}
