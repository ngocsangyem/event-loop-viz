import { StateEffect, StateField } from '@codemirror/state'
import type { EditorState, Extension } from '@codemirror/state'
import { GutterMarker, gutter } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import type { ReplayState } from '../player/replay-state'

export type QueuedConcept = 'job' | 'task' | 'webapi'

/** Fixed order so a line with several kinds of work always draws its squares the same way. */
const CONCEPT_ORDER: QueuedConcept[] = ['job', 'task', 'webapi']

/**
 * Which concepts still hold work whose callback sits on each Script line (1-based), at one
 * replay position: Jobs in the Microtask Queue, Tasks in the Task Queue, timers in Web APIs.
 * Callbacks without a source location (built-ins) have no line and are skipped.
 */
export function queuedLinesAt(
  state: Pick<ReplayState, 'jobs' | 'tasks' | 'timers'>,
): Map<number, QueuedConcept[]> {
  const found = new Map<number, Set<QueuedConcept>>()
  const add = (concept: QueuedConcept, line: number | undefined) => {
    if (line === undefined || line < 1) return
    const set = found.get(line) ?? new Set<QueuedConcept>()
    set.add(concept)
    found.set(line, set)
  }
  for (const job of state.jobs) add('job', job.callback?.loc?.line)
  for (const task of state.tasks) add('task', task.callback?.loc?.line)
  for (const timer of state.timers) add('webapi', timer.callback?.loc?.line)

  const out = new Map<number, QueuedConcept[]>()
  for (const [line, set] of found) out.set(line, CONCEPT_ORDER.filter((c) => set.has(c)))
  return out
}

class QueuedMarker extends GutterMarker {
  constructor(private readonly concepts: readonly QueuedConcept[]) {
    super()
  }
  eq(other: QueuedMarker) {
    return this.concepts.join() === other.concepts.join()
  }
  toDOM() {
    const cell = document.createElement('div')
    cell.className = 'cm-queued-squares'
    // Decorative: the Queue panels name the same work in words.
    cell.setAttribute('aria-hidden', 'true')
    for (const concept of this.concepts) {
      const square = document.createElement('span')
      square.className = `cm-queued-square cm-queued-${concept}`
      cell.append(square)
    }
    return cell
  }
}

export const setQueuedLines = StateEffect.define<Map<number, QueuedConcept[]>>()

const queuedField = StateField.define<Map<number, QueuedConcept[]>>({
  create: () => new Map(),
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setQueuedLines)) return effect.value
    return value
  },
})

/** A 14px gutter column with one 6x6 square per concept that has work queued from that line. */
export function queuedLineGutter(): Extension {
  return [
    queuedField,
    gutter({
      class: 'cm-queued-gutter',
      lineMarker(view: EditorView, line) {
        const concepts = view.state.field(queuedField).get(view.state.doc.lineAt(line.from).number)
        return concepts?.length ? new QueuedMarker(concepts) : null
      },
      lineMarkerChange: (update) => update.transactions.some((tr) => tr.effects.some((e) => e.is(setQueuedLines))),
      initialSpacer: () => new QueuedMarker([]),
    }),
  ]
}

/** Markers currently drawn, for tests. */
export function queuedLinesInState(state: EditorState) {
  return state.field(queuedField)
}
