import type { ReplayState } from '../../player/replay-state'
import { formatConsoleLines } from '../console-lines'
import { loopPhaseOf } from '../panels/event-loop-phase'
import type { LoopPhase } from '../panels/event-loop-phase'
import { visibleFrames } from '../panels/panel-view-model'
import { jobQueueOf } from '../scene/job-queue-model'
import { taskQueueOf } from '../scene/task-queue-model'
import { formatVirtualMs, timerShelfOf } from '../scene/timer-shelf-model'
import type { NodeId } from './diagram-flow'

/** One entry of a card. `detailKey` names the localized wrapper of `detail`, if it has one. */
export interface RowModel {
  id: string
  /** Shown as is, unless `labelKey` names a message to translate instead. */
  label: string
  labelKey?: string
  detail?: string
  detailKey?: 'due' | 'running'
  /** The entry that is running now. */
  active?: boolean
  /** Console lines only: warnings and errors are tinted. */
  tone?: 'warn' | 'error'
}

export interface ListModel {
  rows: RowModel[]
  /** Entries that did not fit the card: shown as "+N". */
  more: number
}

export interface DiagramModel {
  stack: ListModel
  webapis: ListModel
  taskq: ListModel
  microq: ListModel
  /** The newest lines, oldest first; `more` counts the older ones. */
  console: ListModel
  loop: { phase: LoopPhase; clock: string; tick: number | null }
}

/** How many rows each card has room for; the layout decides, narrow screens have fewer. */
export type Capacity = Record<Exclude<NodeId, 'loop'>, number>

const CONSOLE_METHODS = new Set(['log', 'info', 'warn', 'error'])

function limit(rows: RowModel[], capacity: number): ListModel {
  return { rows: rows.slice(0, capacity), more: Math.max(0, rows.length - capacity) }
}

function consoleToneOf(kind: 'console' | 'error', text: string): RowModel['tone'] {
  if (kind === 'error' || text.startsWith('error:')) return 'error'
  return text.startsWith('warn:') ? 'warn' : undefined
}

/**
 * Everything the cards show for one state, as plain data. Same state, same model: the diagram
 * never remembers how it got to a position.
 */
export function diagramModelOf(state: ReplayState, capacity: Capacity): DiagramModel {
  // Top of the stack first. The newest frame is the one running.
  const frames = visibleFrames(state)
  const stackRows = frames
    .map(
      (frame, i): RowModel => ({
        id: frame.frameId,
        label: frame.builtin && CONSOLE_METHODS.has(frame.label) ? `console.${frame.label}` : frame.label,
        active: i === frames.length - 1,
      }),
    )
    .reverse()

  const timerRows = timerShelfOf(state, Number.POSITIVE_INFINITY).shown.filter((block) => block.name === undefined).map(
    (timer): RowModel => ({
      id: timer.tid,
      label: `${timer.repeat ? 'setInterval' : 'setTimeout'} ${timer.tid}`,
      detail: timer.due,
      detailKey: 'due',
    }),
  )

  // Other Web API work in progress: a fetch, a body read, an import, a rAF callback, a waitAsync.
  const opRows = state.webOps.map(
    (op): RowModel => ({
      id: op.opId,
      label: op.api,
      labelKey: `panels.webApis.op.${op.api}`,
      ...(op.dueUs !== undefined && op.dueUs > op.startUs && { detail: formatVirtualMs(op.dueUs), detailKey: 'due' as const }),
    }),
  )

  const { tasks, running: runningTask } = taskQueueOf(state)
  const taskRows = tasks.map((task): RowModel => ({ id: task.taskId, label: task.source, labelKey: `panels.taskSource.${task.source}` }))
  if (runningTask) {
    taskRows.unshift({
      id: runningTask.taskId,
      label: runningTask.source,
      labelKey: `panels.taskSource.${runningTask.source}`,
      detailKey: 'running',
      active: true,
    })
  }

  const { jobs, running: runningJob } = jobQueueOf(state)
  const jobRows = jobs.map((job): RowModel => ({ id: job.jobId, label: job.kind, labelKey: `panels.jobKind.${job.kind}` }))
  if (runningJob) {
    jobRows.unshift({ id: runningJob.jobId, label: runningJob.kind, labelKey: `panels.jobKind.${runningJob.kind}`, detailKey: 'running', active: true })
  }

  // The newest console lines, oldest first, keyed by their place in the output.
  const lines = formatConsoleLines(state.console)
  const firstShown = Math.max(0, lines.length - capacity.console)
  return {
    stack: limit(stackRows, capacity.stack),
    webapis: limit([...timerRows, ...opRows], capacity.webapis),
    taskq: limit(taskRows, capacity.taskq),
    microq: limit(jobRows, capacity.microq),
    console: {
      rows: lines.slice(firstShown).map((line, i): RowModel => {
        const tone = consoleToneOf(line.kind, line.text)
        return { id: `c${firstShown + i}`, label: line.text, ...(tone && { tone }) }
      }),
      more: firstShown,
    },
    loop: { phase: loopPhaseOf(state), clock: formatVirtualMs(state.clockUs), tick: state.tick },
  }
}
