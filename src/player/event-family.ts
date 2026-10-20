import type { TraceEvent } from '../trace/trace-event'

/** Coarse grouping of event kinds, used by the event list filter chips. */
export type EventFamily =
  | 'run'
  | 'task'
  | 'job'
  | 'timer'
  | 'promise'
  | 'frame'
  | 'console'
  | 'error'

export const EVENT_FAMILIES: readonly EventFamily[] = [
  'run',
  'task',
  'job',
  'timer',
  'promise',
  'frame',
  'console',
  'error',
]

export function eventFamily(kind: TraceEvent['k']): EventFamily {
  switch (kind) {
    case 'run:start':
    case 'run:halted':
      return 'run'
    case 'task:queue':
    case 'task:begin':
    case 'task:end':
    case 'checkpoint:begin':
    case 'checkpoint:end':
      return 'task'
    case 'job:enqueue':
    case 'job:begin':
    case 'job:end':
      return 'job'
    case 'timer:init':
    case 'timer:fire':
    case 'timer:clear':
      return 'timer'
    case 'promise:create':
    case 'promise:reaction':
    case 'promise:resolve':
    case 'promise:settle':
    case 'await:suspend':
    case 'await:resume':
    case 'asyncgen:yield':
    case 'asyncgen:resume':
    case 'asyncgen:return-await':
      return 'promise'
    case 'frame:push':
    case 'frame:pop':
      return 'frame'
    case 'console':
      return 'console'
    case 'rejection:track':
    case 'rejection:notify':
    case 'exception:report':
      return 'error'
  }
}
