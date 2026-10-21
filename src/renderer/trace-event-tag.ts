import type { TraceEvent } from '../trace/trace-event'

export interface EventTag {
  /** The mono tag printed in the Trace Events list. Not translated: they are fixed codes. */
  label: 'STACK' | 'JOB' | 'TASK' | 'TIMER' | 'LOG' | 'ERR' | 'HALT' | 'RUN'
  /** Text colour: the concept hue, or the accent for a Halt. */
  className: string
}

const TAGS = {
  STACK: { label: 'STACK', className: 'text-stack' },
  JOB: { label: 'JOB', className: 'text-job' },
  TASK: { label: 'TASK', className: 'text-task' },
  TIMER: { label: 'TIMER', className: 'text-webapi' },
  LOG: { label: 'LOG', className: 'text-console' },
  ERR: { label: 'ERR', className: 'text-error' },
  HALT: { label: 'HALT', className: 'text-brand-text' },
  RUN: { label: 'RUN', className: 'text-muted-foreground' },
} as const satisfies Record<string, EventTag>

/**
 * The concept an event belongs to, as the tag in the Trace Events list. Promise bookkeeping reads
 * as JOB because a promise reaction is what the Job queue runs.
 */
export function eventTag(event: TraceEvent): EventTag {
  switch (event.k) {
    case 'frame:push':
    case 'frame:pop':
      return TAGS.STACK
    case 'job:enqueue':
    case 'job:begin':
    case 'job:end':
    case 'promise:create':
    case 'promise:reaction':
    case 'promise:resolve':
    case 'promise:settle':
    case 'await:suspend':
    case 'await:resume':
    case 'asyncgen:yield':
    case 'asyncgen:resume':
    case 'asyncgen:return-await':
      return TAGS.JOB
    case 'task:queue':
    case 'task:begin':
    case 'task:end':
    case 'checkpoint:begin':
    case 'checkpoint:end':
      return TAGS.TASK
    case 'timer:init':
    case 'timer:fire':
    case 'timer:clear':
      return TAGS.TIMER
    case 'console':
      return event.level === 'error' ? TAGS.ERR : TAGS.LOG
    case 'exception:report':
    case 'rejection:track':
    case 'rejection:notify':
      return TAGS.ERR
    case 'run:halted':
      return TAGS.HALT
    case 'run:start':
      return TAGS.RUN
  }
}
