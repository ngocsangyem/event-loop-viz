// Spotlight: how bright each part of the stage is. While a part of the runtime is being
// introduced or explained, it stays lit and the rest drops back; during the walkthrough every
// part the lesson uses is lit, because the learner follows cards between them.
import type { FocusTarget, LessonPlan, PlanBeat } from '../lesson-types'
import type { FilmClock, FrameInfo } from '../film/film-clock'
import { easeInOut, lerp, span } from '../film/lib/ease'

export type Part = FocusTarget
const DIM = 0.2

function weightIn(beat: PlanBeat | undefined, part: Part): number {
  if (!beat) return 0
  switch (beat.scene) {
    case 'intro':
      return 0
    case 'overview':
      return beat.focus ? (beat.focus === part ? 1 : DIM) : 1
    case 'execute':
      return 1
    case 'why':
      // The console's place goes to the "why" card.
      if (part === 'console') return 0
      return beat.focus === part ? 1 : DIM
    case 'recap':
      return 0
  }
}

/** A part's brightness at this frame, eased from the previous beat's over half a second. */
export function createSpotlight(plan: LessonPlan, clock: FilmClock) {
  return (frame: FrameInfo, part: Part): number => {
    const before = weightIn(plan.beats[frame.beatIndex - 1], part)
    const now = weightIn(frame.beat, part)
    const start = clock.timingOf(frame.beat.id)!.start
    return lerp(before, now, easeInOut(span(frame.t, start, start + 0.5)))
  }
}

export type Spotlight = ReturnType<typeof createSpotlight>
