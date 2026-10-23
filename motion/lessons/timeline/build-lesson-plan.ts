// LessonContent + the real Trace → LessonPlan for one language. Every visual state comes from the
// app's own replay of the Trace; the hand-written content only says where each narrated step stands
// and what it says. A step that skips a visible move, or a Trace that no longer fits the content,
// fails here instead of producing a wrong video.
import type { Trace } from '../../../src/trace/trace-event'
import { createPlayer } from '../../../src/player/player'
import { findMatchedEvent } from '../../../src/renderer/drive/resolve-drive-steps'
import { codeRowsOf } from './code-rows'
import { frameLinesOf, pickedIdsOf, sameView, snapshotOf } from './snapshot-of-state'
import type { SnapshotContext } from './snapshot-of-state'
import { chipLabelsFor, filmLabelsFor, lessonWord, translator } from './lesson-labels'
import type { ContentLine, Lang, LessonContent, LessonPlan, LessonSnapshot, PlanBeat, SceneId } from '../lesson-types'

const camel = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

/** Default silence after a line: a beat to breathe, longer when the scene changes. */
const PAUSE = { line: 0.55, sceneEnd: 1.1 }

function emptySnapshot(): LessonSnapshot {
  return { position: -1, line: null, stack: [], picked: null, webApis: [], tasks: [], jobs: [], parked: [], console: [], phase: 'idle', clockMs: 0 }
}

/** What changed between two snapshots that a narrated step must account for. */
function unexplained(a: LessonSnapshot, b: LessonSnapshot): boolean {
  const key = (s: LessonSnapshot) => JSON.stringify([s.stack.length, s.tasks, s.jobs, s.webApis.map((w) => w.id), s.console.length])
  return key(a) !== key(b)
}

export function buildLessonPlan(content: LessonContent, trace: Trace, lang: Lang): LessonPlan {
  const t = translator(lang)
  const player = createPlayer(trace)
  const ctx: SnapshotContext = {
    trace,
    sourceLines: trace.header.source.split('\n'),
    chipLabels: chipLabelsFor(lang),
    words: {
      script: lessonWord(lang, 'script'),
      anonymous: t('panels.chip.anonymous'),
      resumed: (fn) => lessonWord(lang, 'resumed', { fn }),
    },
    frameLines: frameLinesOf(trace),
    picked: pickedIdsOf(trace),
  }
  const snapshots: LessonSnapshot[] = [emptySnapshot()]
  const beats: PlanBeat[] = []
  const say = (line: ContentLine) => line.say[lang].trim()
  const lineBeat = (scene: SceneId, id: string, line: ContentLine, keyframes: number[], last: boolean): PlanBeat => ({
    id,
    scene,
    say: say(line),
    pause: line.pause ?? (last ? PAUSE.sceneEnd : PAUSE.line),
    ...(line.focus && { focus: line.focus }),
    keyframes,
  })

  content.intro.lines.forEach((line, i, all) => beats.push(lineBeat('intro', `intro-${i + 1}`, line, [0], i === all.length - 1)))
  content.overview.forEach((line, i, all) => beats.push(lineBeat('overview', `overview-${i + 1}`, line, [0], i === all.length - 1)))

  // Execution: each step animates every distinct view between the previous step and its own event.
  const visible = player.stepPositions()
  let previous = -1
  content.steps.forEach((step, i) => {
    const at = findMatchedEvent(trace.events, step.at)
    if (at === null) throw new Error(`${content.id}: step ${i + 1} matches no event: ${JSON.stringify(step.at)}`)
    if (at <= previous) throw new Error(`${content.id}: step ${i + 1} (event ${at}) is not after step ${i} (event ${previous})`)
    const keyframes: number[] = []
    for (const position of visible) {
      if (position <= previous || position > at) continue
      const view = snapshotOf(player.stateAt(position), ctx)
      if (sameView(view, snapshots[snapshots.length - 1]!)) continue
      // A → B → A inside one step is engine plumbing (a frame pushed and popped at once): show A only.
      const twoBack = keyframes.length >= 2 ? snapshots[keyframes[keyframes.length - 2]!] : undefined
      if (twoBack && sameView(view, twoBack)) {
        snapshots.pop()
        keyframes.pop()
        continue
      }
      snapshots.push(view)
      keyframes.push(snapshots.length - 1)
    }
    if (keyframes.length === 0) keyframes.push(snapshots.length - 1)
    beats.push({
      ...lineBeat('execute', `step-${i + 1}`, step, keyframes, i === content.steps.length - 1),
      ...(step.note && { note: step.note[lang] }),
    })
    previous = at
  })

  // Moves after the last step may only be bookkeeping (the stack emptying, the run ending).
  const finalView = snapshotOf(player.stateAt(trace.events.length - 1), ctx)
  const lastShown = snapshots[snapshots.length - 1]!
  if (unexplained(lastShown, finalView)) {
    throw new Error(`${content.id}: moves after the last step are not narrated (console ${lastShown.console.length} → ${finalView.console.length}, tasks ${lastShown.tasks.length} → ${finalView.tasks.length}, jobs ${lastShown.jobs.length} → ${finalView.jobs.length}, stack ${lastShown.stack.length} → ${finalView.stack.length})`)
  }
  if (!sameView(lastShown, finalView)) {
    snapshots.push(finalView)
    beats[beats.length - 1]!.keyframes.push(snapshots.length - 1)
  }
  const end = snapshots.length - 1

  content.why.forEach((why, i, all) =>
    beats.push({ ...lineBeat('why', `why-${i + 1}`, why, [end], i === all.length - 1), title: why.title[lang] }),
  )
  content.recap.lines.forEach((line, i, all) => beats.push(lineBeat('recap', `recap-${i + 1}`, line, [end], i === all.length - 1)))

  const key = `examples.items.${camel(content.id)}`
  return {
    id: content.id,
    lang,
    title: t(`${key}.title`),
    description: t(`${key}.description`),
    question: content.intro.question[lang],
    code: codeRowsOf(trace.header.source).rows,
    panels: content.panels,
    snapshots,
    beats,
    output: finalView.console.map((row) => row.text),
    takeaways: content.recap.takeaways.map((line) => line[lang]),
    model: content.recap.model[lang],
    labels: filmLabelsFor(lang),
  }
}
