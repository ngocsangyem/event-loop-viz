// Beat layout: turns measured voice lengths into the lesson's time line. Shared by the voice step
// (which writes it) and the film (which reads its output), so the rules live in one place.
// Moves of an execution beat are spread across its sentence, in order, so each move lands while
// the voice describes it rather than all at once before the words catch up.

/** Longest a single move takes on screen, and the shortest slot it may get. */
const MOVE = { max: 0.9, min: 0.55 }
/** Silence before a beat's voice; longer when a new scene starts so its picture can settle. */
const LEAD = { beat: 0.35, scene: 1.0, first: 1.8 }
/** Silence held after the last beat, so the video does not cut off the final word. */
const TAIL = 1.6

export function layOutBeats(plan, speechSeconds) {
  let t = 0
  const beats = plan.beats.map((beat, i) => {
    const sceneStart = i === 0 || plan.beats[i - 1].scene !== beat.scene
    const lead = i === 0 ? LEAD.first : sceneStart ? LEAD.scene : LEAD.beat
    const start = t
    const speech = start + lead
    const speechDuration = speechSeconds[i]
    const moves = []
    if (beat.scene === 'execute') {
      const n = beat.keyframes.length
      // The first move starts with the voice; the moves share 80% of the sentence, at least MOVE.min each.
      const slot = Math.max(MOVE.min, (speechDuration * 0.8) / n)
      for (let k = 0; k < n; k++) {
        const from = speech - 0.15 + k * slot
        moves.push({ start: from, end: from + Math.min(MOVE.max, slot) })
      }
    }
    const lastMove = moves.length ? moves[moves.length - 1].end + 0.5 : 0
    const end = Math.max(speech + speechDuration + beat.pause, lastMove)
    t = end
    return { id: beat.id, start, speech, speechDuration, end, moves }
  })
  return { id: plan.id, lang: plan.lang, duration: t + TAIL, beats }
}
