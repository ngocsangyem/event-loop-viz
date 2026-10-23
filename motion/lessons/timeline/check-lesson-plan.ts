// Accuracy checks a plan must pass before any voice or frame is made from it.
import type { ObservableOutput } from '../../../src/trace/observable-output'
import type { LessonPlan } from '../lesson-types'

/** Longest a narrated line may be before it is too much to follow in one breath, in characters. */
const MAX_SAY = 300
/** Vietnamese letters: none may appear in English narration (the English voice would read them). */
const VIETNAMESE = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹáàãéèíìóòõúùýđ]/i

/** Most moves one step may animate: more and the narration cannot keep up with the picture. */
const MAX_MOVES = 7

export function checkLessonPlan(plan: LessonPlan, output: ObservableOutput): string[] {
  const problems: string[] = []
  const expected = output.map((entry) => ('text' in entry ? entry.text : entry.message))
  const shown = plan.snapshots[plan.snapshots.length - 1]!.console.map((row) => row.text)
  if (shown.length !== expected.length || shown.some((text, i) => !text.includes(expected[i]!))) {
    problems.push(`console ${JSON.stringify(shown)} does not match the run's output ${JSON.stringify(expected)}`)
  }
  for (const beat of plan.beats) {
    if (!beat.say) problems.push(`${beat.id}: empty narration`)
    if (beat.say.length > MAX_SAY) problems.push(`${beat.id}: narration is ${beat.say.length} chars (max ${MAX_SAY})`)
    if (beat.keyframes.length > MAX_MOVES) problems.push(`${beat.id}: animates ${beat.keyframes.length} moves (max ${MAX_MOVES}); split the step`)
    if (/[`]|=>|\(\)/.test(beat.say)) problems.push(`${beat.id}: narration has code symbols the voice would read out`)
  }
  if (plan.lang === 'en') {
    for (const beat of plan.beats) if (VIETNAMESE.test(beat.say)) problems.push(`${beat.id}: Vietnamese text in English narration`)
  }
  // The opening question must not give the answer away: it may not list the printed lines in order.
  const listed = expected.filter((text) => text.length > 1 && plan.question.includes(text))
  if (expected.length > 1 && listed.length >= Math.min(3, expected.length)) problems.push(`intro question lists the output (${listed.join(', ')}): ask without revealing it`)
  for (const scene of ['intro', 'overview', 'execute', 'why', 'recap'] as const) {
    if (!plan.beats.some((beat) => beat.scene === scene)) problems.push(`no ${scene} beat`)
  }
  for (const panel of plan.panels) {
    const used = plan.snapshots.some((s) => (panel === 'webApis' ? s.webApis : panel === 'tasks' ? s.tasks : s.jobs).length > 0)
    if (!used) problems.push(`panel ${panel} is shown but nothing ever enters it`)
  }
  const used = (pick: (s: LessonPlan['snapshots'][number]) => unknown[]) => plan.snapshots.some((s) => pick(s).length > 0)
  if (used((s) => s.webApis) && !plan.panels.includes('webApis')) problems.push('Web APIs are used but the panel is hidden')
  if (used((s) => s.jobs) && !plan.panels.includes('microtasks')) problems.push('microtasks are queued but the panel is hidden')
  return problems
}
