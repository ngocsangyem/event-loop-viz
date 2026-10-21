import { explainEvent } from '@/player/explain-event'
import type { ReplayState } from '@/player/replay-state'
import type { TraceEvent } from '@/trace/trace-event'

export const MAX_SCRIPT_CHARS = 6000
export const MAX_CONSOLE_LINES = 20
export const MAX_CONSOLE_LINE_CHARS = 120
export const PREVIOUS_EVENT_COUNT = 5
const MAX_QUEUE_ITEMS = 12
const MAX_EXPLANATION_CHARS = 260

export interface StepContextInput {
  script: string
  events: readonly TraceEvent[]
  position: number
  state: ReplayState
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
  if (state.console.length === 0) return 'nothing printed yet'
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

function summarizeState(state: ReplayState): string {
  const stack = list(state.stack, (f) => (f.builtin ? `${f.label} (built-in)` : f.label))
  const tasks = list(state.tasks, (t) =>
    `${t.taskId} from ${t.source}${t.dueUs === undefined ? '' : ` due ${t.dueUs / 1000} ms`}`)
  const jobs = list(state.jobs, (j) =>
    `${j.jobId} ${j.jobKind}${j.outcome ? ` (${j.outcome})` : ''}`)
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

/**
 * The text the AI reads with each question, rebuilt at the current playhead: the Script, the
 * current event with the built-in explanation, the replay state and the last few visible events.
 * Pure, so it can be unit tested and never touches the DOM.
 */
export function buildStepContext({ script, events, position, state }: StepContextInput): string {
  const parts = [`Script (line numbers added):\n${numberedScript(script)}`]
  const event = events[position]
  if (!event) {
    parts.push('No Run yet: there is no Trace, so no step to explain. Answer from the Script alone and say so.')
    return parts.join('\n\n')
  }
  parts.push(`Current step:\n${describeEvent(event, events)}`)
  const previous = events
    .slice(0, position)
    .filter((e) => e.visible)
    .slice(-PREVIOUS_EVENT_COUNT)
  if (previous.length > 0) {
    parts.push(`Previous visible events (oldest first):\n${previous.map((e) => describeEvent(e, events)).join('\n')}`)
  }
  parts.push(`Replay state at this step:\n${summarizeState(state)}`)
  return parts.join('\n\n')
}
