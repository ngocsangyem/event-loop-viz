import type { QueuedTask } from '../../player/replay-state'
import type { TraceEvent } from '../../trace/trace-event'

/** The cards of the diagram. */
export type NodeId = 'stack' | 'webapis' | 'taskq' | 'microq' | 'loop' | 'console'

/** The connectors between cards. Ids are stable: tests and styles key off them. */
export type EdgeId = 'register' | 'timer-fires' | 'next-task' | 'run-task' | 'queue-job' | 'run-job' | 'log'

/** Where each edge leaves and arrives; the signal travels from `from` to `to`. */
export const EDGE_ENDS: Record<EdgeId, { from: NodeId; to: NodeId }> = {
  register: { from: 'stack', to: 'webapis' },
  'timer-fires': { from: 'webapis', to: 'taskq' },
  'next-task': { from: 'taskq', to: 'loop' },
  'run-task': { from: 'loop', to: 'stack' },
  'queue-job': { from: 'stack', to: 'microq' },
  'run-job': { from: 'microq', to: 'stack' },
  log: { from: 'stack', to: 'console' },
}

export const NODE_IDS: readonly NodeId[] = ['stack', 'webapis', 'taskq', 'microq', 'loop', 'console']
export const EDGE_IDS = Object.keys(EDGE_ENDS) as EdgeId[]

/** Which message `diagram.step.<key>` describes the step, and its parameters. */
export type StepKey =
  | 'register'
  | 'timerCallback'
  | 'message'
  | 'runTask'
  | 'timerDue'
  | 'runTimerTask'
  | 'queueJob'
  | 'runJob'
  | 'log'
  | 'uncaught'
  | 'unhandledRejection'
  | 'push'
  | 'pop'
  | 'checkpointBegin'
  | 'checkpointEnd'
  | 'halted'

export interface Flow {
  /** Edges the signal travels, in order (a Task takes two hops). */
  edges: EdgeId[]
  /** Cards whose border is drawn in when the signal arrives (or at once without an edge). */
  lit: NodeId[]
  /** An error reached the Console: drawn in the refusal colour. */
  refused?: boolean
  step: { key: StepKey; params: Record<string, string> } | null
}

export const IDLE_FLOW: Flow = { edges: [], lit: [], step: null }

const flow = (
  key: StepKey,
  edges: EdgeId[],
  lit: NodeId[],
  params: Record<string, string> = {},
  refused = false,
): Flow => ({ edges, lit, step: { key, params }, ...(refused ? { refused } : {}) })

/**
 * What one Trace Event does on the diagram: which edges the signal runs along and which cards
 * light up. A pure function of the event and, for a Task that starts, where that Task came
 * from; unrelated events map to the idle flow, which leaves the diagram still.
 */
export function flowForEvent(
  event: TraceEvent | undefined,
  taskSource: QueuedTask['source'] | null = null,
): Flow {
  if (!event) return IDLE_FLOW
  switch (event.k) {
    case 'timer:init':
      return flow('register', ['register'], ['webapis'])
    case 'timer:fire':
      // The timer's Task is already running: its callback is what lands on the stack.
      return flow('timerCallback', [], ['stack'])
    case 'task:queue':
      // A timer's Task is queued when its time is up, so the Web APIs -> Task Queue hop plays here.
      if (event.source === 'timer') return flow('timerDue', ['timer-fires'], ['taskq'])
      if (event.source === 'port-message') return flow('message', ['timer-fires'], ['taskq'])
      return IDLE_FLOW
    case 'task:begin':
      return taskSource === 'timer'
        ? flow('runTimerTask', ['next-task', 'run-task'], ['taskq', 'loop', 'stack'])
        : flow('runTask', ['next-task', 'run-task'], ['loop', 'stack'])
    case 'job:enqueue':
      // Settles and reactions are followed by their own job:enqueue, which carries the hop, so
      // the hop never plays twice for one Job.
      return flow('queueJob', ['queue-job'], ['microq'])
    case 'job:begin':
      return flow('runJob', ['run-job'], ['stack'])
    case 'console':
      return flow('log', ['log'], ['console'])
    case 'exception:report':
      return flow('uncaught', ['log'], ['console'], {}, true)
    case 'rejection:notify':
      return event.outcome === 'unhandled' ? flow('unhandledRejection', ['log'], ['console'], {}, true) : IDLE_FLOW
    case 'frame:push':
      return flow('push', [], ['stack'], { label: event.label })
    case 'frame:pop':
      return flow('pop', [], ['stack'], { label: event.label })
    case 'checkpoint:begin':
      return flow('checkpointBegin', [], ['loop', 'microq'])
    case 'checkpoint:end':
      return flow('checkpointEnd', [], ['loop', 'microq'])
    case 'run:halted':
      return flow('halted', [], ['loop'])
    default:
      return IDLE_FLOW
  }
}
