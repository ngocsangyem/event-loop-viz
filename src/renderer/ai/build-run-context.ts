import { explainEvent } from '@/player/explain-event'
import type { ReplayState } from '@/player/replay-state'
import type { CallbackInfo, TraceEvent } from '@/trace/trace-event'
import { chipText } from '@/renderer/panels/callback-chip-model'

export const MAX_SCRIPT_CHARS = 6000
export const MAX_CONSOLE_LINES = 20
export const MAX_CONSOLE_LINE_CHARS = 120
/** Visible events listed for the whole Run; a longer Trace keeps its start and says how much is cut. */
export const MAX_TRACE_EVENTS = 240
const MAX_QUEUE_ITEMS = 12
const MAX_CALLBACK_CHARS = 80
const MAX_EXPLANATION_CHARS = 180

export interface RunContextInput {
  script: string
  events: readonly TraceEvent[]
  /** The learner's playhead. */
  position: number
  /** Replay state at the playhead. */
  state: ReplayState
  /** Replay state after the last event: the Run's whole console output. */
  finalState: ReplayState
}

/** What the context chip shows: the step the AI will see, or null before any Run. */
export function currentStep(
  events: readonly TraceEvent[],
  position: number,
): { seq: number; kind: string } | null {
  const event = events[position]
  return event ? { seq: event.seq, kind: event.k } : null
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** The Script with line numbers, cut at a line boundary once it passes the size limit. */
export function numberedScript(script: string): string {
  const lines = script.split('\n')
  const out: string[] = []
  let used = 0
  for (const [i, line] of lines.entries()) {
    const numbered = `${i + 1}| ${line}`
    if (used + numbered.length > MAX_SCRIPT_CHARS && out.length > 0) {
      out.push(`(Script truncated: ${lines.length - i} more lines not shown)`)
      break
    }
    out.push(numbered)
    used += numbered.length + 1
  }
  return out.join('\n')
}

function describeEvent(event: TraceEvent, events: readonly TraceEvent[]): string {
  const where = event.loc ? `line ${event.loc.line}` : 'no source line'
  const text = clip(explainEvent(event, events).text, MAX_EXPLANATION_CHARS)
  return `#${event.seq} ${event.k} (${where}, t=${event.t / 1000} ms): ${text}`
}

function list<T>(items: readonly T[], show: (item: T) => string): string {
  if (items.length === 0) return 'empty'
  const shown = items.slice(0, MAX_QUEUE_ITEMS).map(show).join(', ')
  return items.length > MAX_QUEUE_ITEMS ? `${shown}, … (${items.length} total)` : shown
}

function consoleLines(state: ReplayState): string {
  if (state.console.length === 0) return 'nothing printed'
  const tail = state.console.slice(-MAX_CONSOLE_LINES)
  const lines = tail.map((entry) => {
    switch (entry.kind) {
      case 'console':
        return `[${entry.level}] ${entry.text}`
      case 'uncaught-exception':
        return `[uncaught] ${entry.message}`
      case 'unhandled-rejection':
        return `[unhandled rejection] ${entry.message}`
      case 'rejection-handled':
        return `[rejection handled] ${entry.message}`
    }
  })
  const omitted = state.console.length - tail.length
  const clipped = lines.map((l) => clip(l, MAX_CONSOLE_LINE_CHARS))
  return (omitted > 0 ? [`(${omitted} earlier lines omitted)`, ...clipped] : clipped).join('\n')
}

const ENGLISH_CHIP_LABELS = {
  awaitResume: (fn: string) => `${fn} after await`,
  anonymous: '(anonymous)',
  line: (line: number) => `line ${line}`,
}

/** ` running <code>` for a Task or Job whose callback is known, so the AI names the code the learner sees. */
function callbackNote(info: CallbackInfo | undefined, script: string): string {
  const text = info && chipText(info, script, ENGLISH_CHIP_LABELS)
  return text ? ` calling \`${clip(text.full, MAX_CALLBACK_CHARS)}\`` : ''
}

function summarizeState(state: ReplayState, script: string): string {
  const stack = list(state.stack, (f) => (f.builtin ? `${f.label} (built-in)` : f.label))
  const tasks = list(state.tasks, (t) =>
    `${t.taskId} from ${t.source}${t.dueUs === undefined ? '' : ` due ${t.dueUs / 1000} ms`}${callbackNote(t.callback, script)}`)
  const jobs = list(state.jobs, (j) =>
    `${j.jobId} ${j.jobKind}${j.outcome ? ` (${j.outcome})` : ''}${callbackNote(j.callback, script)}`)
  const timers = list(state.timers, (t) =>
    `${t.tid} due ${t.dueUs / 1000} ms${t.repeat ? ' repeating' : ''}`)
  const running = [
    state.currentTask ? `Task ${state.currentTask}` : null,
    state.currentJob ? `Job ${state.currentJob}${state.tick ? ` (Tick ${state.tick})` : ''}` : null,
    state.inCheckpoint ? 'inside a Checkpoint' : null,
  ].filter(Boolean)
  return [
    `Virtual Clock: ${state.clockUs / 1000} ms`,
    `Running: ${running.length > 0 ? running.join(', ') : 'nothing'}`,
    `Call stack (top last): ${stack}`,
    `Task queue: ${tasks}`,
    `Microtask queue (Jobs): ${jobs}`,
    `Pending timers: ${timers}`,
    state.halted ? `Halted: ${state.halted.reason}` : null,
    `Console so far:\n${consoleLines(state)}`,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

function traceListing(events: readonly TraceEvent[]): string {
  const visible = events.filter((e) => e.visible)
  const shown = visible.slice(0, MAX_TRACE_EVENTS).map((e) => describeEvent(e, events))
  if (visible.length > MAX_TRACE_EVENTS) {
    shown.push(`(Trace truncated: ${visible.length - MAX_TRACE_EVENTS} more visible events not shown)`)
  }
  return shown.join('\n')
}

/**
 * The text the AI reads with each question: the Script, every visible event of the Run with its
 * built-in explanation, the Run's output, and where the learner's playhead is. The whole Run is
 * there so an answer can walk through it stop by stop. Pure, so it can be unit tested.
 */
export function buildRunContext({ script, events, position, state, finalState }: RunContextInput): string {
  const parts = [`Script (line numbers added):\n${numberedScript(script)}`]
  const event = events[position]
  if (!event) {
    parts.push('No Run yet: there is no Trace, so no steps to point at. Answer from the Script alone and say so.')
    return parts.join('\n\n')
  }
  const visibleCount = events.filter((e) => e.visible).length
  parts.push(`Trace of the whole Run (${visibleCount} visible events, oldest first):\n${traceListing(events)}`)
  parts.push(`Console output of the whole Run:\n${consoleLines(finalState)}`)
  if (finalState.halted) parts.push(`The Run halted: ${finalState.halted.reason}`)
  parts.push(`The learner's playhead is at:\n${describeEvent(event, events)}`)
  parts.push(`Replay state at the playhead:\n${summarizeState(state, script)}`)
  return parts.join('\n\n')
}
