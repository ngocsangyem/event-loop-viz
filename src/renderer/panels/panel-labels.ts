import type { QueuedJob, QueuedTask } from '../../player/replay-state'

/** Short names for where a Task came from, as the panels show them. */
export const TASK_SOURCE_LABEL: Record<QueuedTask['source'], string> = {
  script: 'Script',
  timer: 'Timer',
  'port-message': 'MessagePort',
  'dom-manipulation': 'DOM',
}

/** Short names for what a Job runs, as the panels show them. */
export const JOB_KIND_LABEL: Record<QueuedJob['jobKind'], string> = {
  reaction: 'Promise reaction',
  thenable: 'Resolve thenable',
  microtask: 'queueMicrotask',
}
