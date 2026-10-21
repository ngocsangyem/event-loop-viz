import type { TraceEvent } from '../trace/trace-event'

type TaskSource = Extract<TraceEvent, { k: 'task:queue' }>['source']

/** One line of the Trace Events list: an event, or the header of the Task whose turn follows. */
export type EventRow =
  | { type: 'group'; key: string; seq: number; taskId: string; source: TaskSource | null }
  | { type: 'event'; event: TraceEvent }

/** For every event, the Task whose turn it falls in (null before the first Task), and each Task's source. */
export interface TaskTurns {
  taskAt: (string | null)[]
  sourceOf: Map<string, TaskSource>
}

/**
 * A Task's turn runs from its `task:begin` to the next one, so the Checkpoint after it and the
 * Jobs it drains belong to the same turn. Computed on the whole Trace, so filtering rows out
 * never moves an event into another turn.
 */
export function taskTurnsOf(events: readonly TraceEvent[]): TaskTurns {
  const taskAt: (string | null)[] = new Array(events.length)
  const sourceOf = new Map<string, TaskSource>()
  let current: string | null = null
  for (let i = 0; i < events.length; i++) {
    const event = events[i]!
    if (event.k === 'task:queue') sourceOf.set(event.taskId, event.source)
    else if (event.k === 'task:begin') current = event.taskId
    taskAt[i] = current
  }
  return { taskAt, sourceOf }
}

/** The list lines for `rows`, with a group header wherever the Task turn changes. */
export function buildEventRows(rows: readonly TraceEvent[], turns: TaskTurns): EventRow[] {
  const out: EventRow[] = []
  let previous: string | null = null
  for (const event of rows) {
    const taskId = turns.taskAt[event.seq] ?? null
    if (taskId !== null && taskId !== previous) {
      out.push({ type: 'group', key: `group-${event.seq}`, seq: event.seq, taskId, source: turns.sourceOf.get(taskId) ?? null })
    }
    previous = taskId
    out.push({ type: 'event', event })
  }
  return out
}

/** Index of the line showing the event with `seq`, or -1. Lines are sorted by seq; a header precedes its first event. */
export function rowIndexOfSeq(rows: readonly EventRow[], seq: number): number {
  let low = 0
  let high = rows.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    const row = rows[mid]!
    if (row.type === 'group' ? row.seq < seq : row.event.seq < seq) low = mid + 1
    else high = mid - 1
  }
  // `low` is the first line at or after the seq: the event, or its header, which sits right before it.
  const hit = rows[low]
  const at = hit?.type === 'group' ? low + 1 : low
  const row = rows[at]
  return row?.type === 'event' && row.event.seq === seq ? at : -1
}
