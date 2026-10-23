// Turns the app's ReplayState into what a lesson frame shows. Reuses the panels' own models
// (callback chips, Web API cards, loop phase, which built-ins a learner wrote) so the video and
// the app always name things the same way.
import type { ReplayState } from '../../../src/player/replay-state'
import type { Trace } from '../../../src/trace/trace-event'
import { chipText, builtinLabel } from '../../../src/renderer/panels/callback-chip-model'
import type { ChipLabels } from '../../../src/renderer/panels/callback-chip-model'
import { webApiCardsOf, webOpCardsOf } from '../../../src/renderer/panels/web-api-card-model'
import { loopPhaseOf } from '../../../src/renderer/panels/event-loop-phase'
import { builtinShown, callNameOf } from '../../../src/renderer/drive/narrated-builtins'
import type { LessonSnapshot, LoopPhase, QueueItem, StackItem, WebApiItem } from '../lesson-types'

export interface SnapshotContext {
  trace: Trace
  sourceLines: string[]
  chipLabels: ChipLabels
  /** "Script", "(anonymous)"… in the lesson's language. */
  words: { script: string; anonymous: string; resumed: (fn: string) => string }
  /** frameId → source line it was pushed from. */
  frameLines: Map<string, number>
  /** Trace position → the Task or Job begun there whose first frame is not pushed yet. */
  picked: (string | null)[]
}

export function frameLinesOf(trace: Trace): Map<string, number> {
  const lines = new Map<string, number>()
  for (const event of trace.events) {
    if (event.k === 'frame:push' && event.loc && !lines.has(event.frameId)) lines.set(event.frameId, event.loc.line)
  }
  return lines
}

/** For each position: the Task or Job id the event loop has just begun, until its first frame is pushed. */
export function pickedIdsOf(trace: Trace): (string | null)[] {
  let current: string | null = null
  return trace.events.map((event) => {
    if (event.k === 'task:begin') current = event.taskId
    else if (event.k === 'job:begin') current = event.jobId
    else if (event.k === 'frame:push' || event.k === 'task:end' || event.k === 'job:end') current = null
    return current
  })
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

function codeOf(ctx: SnapshotContext, info: Parameters<typeof chipText>[0] | undefined): string {
  if (!info) return ''
  return chipText(info, ctx.trace.header.source, ctx.chipLabels)?.text ?? ''
}

/**
 * The frames a learner should see, bottom to top: the Script's global code, their own functions,
 * the built-ins their code calls by name, and a queued callback while it runs. Host wrapper frames
 * (labelled `script` inside a Task or Job), built-ins called by built-ins and engine closures stay
 * hidden; an async function's two engine frames show as one.
 */
function stackOf(state: ReplayState, ctx: SnapshotContext): StackItem[] {
  const out: StackItem[] = []
  const running = state.runningCallback
  state.stack.forEach((frame, i) => {
    const below = state.stack[i - 1]
    if (frame.label === 'script' && !frame.builtin) {
      // Same id as the Script's Task, so the Task visibly moves from the queue onto the stack.
      if (i === 0 && state.currentTaskSource === 'script') out.push({ id: state.currentTask ?? frame.frameId, label: ctx.words.script, kind: 'script' })
      return
    }
    if (frame.builtin) {
      const lineText = ctx.sourceLines[(ctx.frameLines.get(frame.frameId) ?? 0) - 1] ?? ''
      if (below?.builtin || !builtinShown(frame.label, lineText)) return
      out.push({ id: frame.frameId, label: callNameOf(frame.label, lineText) || builtinLabel(frame.label), kind: 'builtin' })
      return
    }
    if (running && !running.done && frame.frameId === running.frameId) {
      const named = frame.label !== '(anonymous)'
      const label =
        running.callback.kind === 'await'
          ? ctx.words.resumed(named ? `${frame.label}()` : ctx.words.anonymous)
          : named
            ? `${frame.label}()`
            : oneLine(codeOf(ctx, running.callback))
      out.push({ id: running.chipId, label, kind: 'callback' })
      return
    }
    const label = frame.label === '(anonymous)' ? ctx.words.anonymous : `${frame.label}()`
    const top = out[out.length - 1]
    if (top && top.kind === 'function' && top.label === label) return
    out.push({ id: frame.frameId, label, kind: 'function' })
  })
  return out
}

function webApisOf(state: ReplayState, ctx: SnapshotContext): WebApiItem[] {
  const timers = webApiCardsOf(state).cards.map(
    (card): WebApiItem => ({
      id: card.key,
      kind: card.api,
      code: codeOf(ctx, card.callback),
      detail: card.clamped ? `${card.requestedMs} → ${card.delay}` : card.delay.replace('ms', ' ms'),
    }),
  )
  const ops = webOpCardsOf(state).cards.map(
    (card): WebApiItem => ({
      id: card.key,
      kind: ctx.chipLabels.webApi(card.api),
      code: codeOf(ctx, card.callback),
      detail: [card.left?.replace('ms', ' ms'), card.detail].filter(Boolean).join(' · '),
    }),
  )
  return [...timers, ...ops]
}

function phaseOf(state: ReplayState): LoopPhase {
  const phase = loopPhaseOf(state)
  return phase === 'task' && state.currentTaskSource === 'animation-frame' ? 'render' : phase
}

export function snapshotOf(state: ReplayState, ctx: SnapshotContext): LessonSnapshot {
  const tasks = state.tasks.map(
    (task): QueueItem => ({ id: task.taskId, kind: ctx.chipLabels.taskSource(task.source), code: codeOf(ctx, task.callback) }),
  )
  const jobs = state.jobs.map(
    (job): QueueItem => ({ id: job.jobId, kind: ctx.chipLabels.jobKind(job.jobKind), code: codeOf(ctx, job.callback) }),
  )
  const parked = state.suspendedAwaits.map((s) => (s.label === '(anonymous)' || s.label.startsWith('frame-') ? ctx.words.anonymous : `${s.label}()`))
  const stack = stackOf(state, ctx)
  const pickedId = ctx.picked[state.position] ?? null
  let picked: QueueItem | null = null
  if (pickedId !== null) {
    const running = state.runningCallback
    const kind = state.currentJob === pickedId
      ? ctx.chipLabels.jobKind(state.currentJobKind ?? 'reaction')
      : ctx.chipLabels.taskSource(state.currentTaskSource ?? 'script')
    picked = { id: pickedId, kind, code: running?.chipId === pickedId ? codeOf(ctx, running.callback) : '' }
  }
  return {
    position: state.position,
    line: stack.length > 0 ? (state.sourceRange?.line ?? null) : null,
    stack,
    picked,
    webApis: webApisOf(state, ctx),
    tasks,
    jobs,
    parked,
    console: state.console.map((entry) => {
      if (entry.kind === 'console') return { text: entry.text, level: entry.level }
      if (entry.kind === 'unhandled-rejection') return { text: `Uncaught (in promise) ${entry.message}`, level: 'error' as const }
      if (entry.kind === 'rejection-handled') return { text: `rejectionhandled: ${entry.message}`, level: 'warn' as const }
      return { text: `Uncaught ${entry.message}`, level: 'error' as const }
    }),
    phase: phaseOf(state),
    clockMs: Math.round(state.clockUs) / 1000,
  }
}

/** Two snapshots that draw the same frame (positions and the clock aside). */
export function sameView(a: LessonSnapshot, b: LessonSnapshot): boolean {
  const view = (s: LessonSnapshot) =>
    JSON.stringify([s.line, s.stack, s.picked, s.webApis.map((w) => [w.id, w.kind]), s.tasks, s.jobs, s.parked, s.console.length, s.phase])
  return view(a) === view(b)
}
