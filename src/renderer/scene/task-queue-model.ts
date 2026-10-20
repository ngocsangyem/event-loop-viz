import type { QueuedTask, ReplayState } from '../../player/replay-state'

type TaskSource = QueuedTask['source']

export interface TaskTokenModel {
  taskId: string
  source: TaskSource
}

export interface TaskQueueModel {
  /** Queued Tasks in the order they were queued. */
  tasks: TaskTokenModel[]
  /** The Task on the run pad, if one is running. */
  running: TaskTokenModel | null
}

/** What the task-queue part shows for one ReplayState: pure data, no geometry. */
export function taskQueueOf(state: ReplayState): TaskQueueModel {
  const tasks = state.tasks.map(
    (task): TaskTokenModel => ({ taskId: task.taskId, source: task.source }),
  )
  const running =
    state.currentTask !== null && state.currentTaskSource !== null
      ? { taskId: state.currentTask, source: state.currentTaskSource }
      : null
  return { tasks, running }
}
