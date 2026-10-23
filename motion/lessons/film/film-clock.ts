// Time → where the lesson is. The film's only notion of "now": everything else is derived from
// the FrameInfo this returns, so any frame can be painted without the frames before it.
import type { BeatTiming, LessonPlan, LessonSnapshot, LessonTiming, PlanBeat, SceneId } from '../lesson-types'
import { easeInOut, span } from './lib/ease'

export interface FrameInfo {
  t: number
  beatIndex: number
  beat: PlanBeat
  timing: BeatTiming
  scene: SceneId
  /** Seconds since the current scene started. */
  sceneTime: number
  /** Seconds since the current beat started. */
  beatTime: number
  /** The runtime view moving from `from` to `to` with eased progress `p` (equal when holding). */
  from: LessonSnapshot
  to: LessonSnapshot
  p: number
  /** Index of the move playing (or last played) in this beat; -1 outside execute. */
  move: number
  /** 0..1 through the voice of the current beat. */
  speechProgress: number
}

export interface FilmClock {
  at(t: number): FrameInfo
  sceneStart(scene: SceneId): number
  beatStart(id: string): number
  timingOf(id: string): BeatTiming | undefined
  duration: number
}

export function createFilmClock(plan: LessonPlan, timing: LessonTiming): FilmClock {
  const beats = timing.beats
  const sceneStarts = new Map<SceneId, number>()
  plan.beats.forEach((beat, i) => {
    if (!sceneStarts.has(beat.scene)) sceneStarts.set(beat.scene, beats[i]!.start)
  })

  /** The snapshot showing at the end of beat i (its last keyframe). */
  const settled = (i: number) => {
    const frames = plan.beats[i]?.keyframes ?? [0]
    return plan.snapshots[frames[frames.length - 1] ?? 0]!
  }

  function at(t: number): FrameInfo {
    let i = beats.findIndex((b) => t < b.end)
    if (i === -1) i = beats.length - 1
    const beat = plan.beats[i]!
    const timingOf = beats[i]!
    const sceneTime = t - sceneStarts.get(beat.scene)!
    let from = i > 0 ? settled(i - 1) : plan.snapshots[0]!
    let to = from
    let p = 1
    let move = -1
    if (beat.scene === 'execute') {
      move = -1
      timingOf.moves.forEach((m, k) => {
        if (t >= m.start) move = k
      })
      if (move === -1) {
        to = from
      } else {
        from = move === 0 ? from : plan.snapshots[beat.keyframes[move - 1]!]!
        to = plan.snapshots[beat.keyframes[move]!]!
        const m = timingOf.moves[move]!
        p = easeInOut(span(t, m.start, m.end))
      }
    } else {
      from = to = settled(i)
    }
    return {
      t,
      beatIndex: i,
      beat,
      timing: timingOf,
      scene: beat.scene,
      sceneTime,
      beatTime: t - timingOf.start,
      from,
      to,
      p,
      move,
      speechProgress: span(t, timingOf.speech, timingOf.speech + timingOf.speechDuration),
    }
  }

  return {
    at,
    sceneStart: (scene) => sceneStarts.get(scene) ?? Infinity,
    beatStart: (id) => beats.find((b) => b.id === id)?.start ?? Infinity,
    timingOf: (id) => beats.find((b) => b.id === id),
    duration: timing.duration,
  }
}
