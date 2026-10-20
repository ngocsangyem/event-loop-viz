import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import { taskQueueOf } from '../task-queue-model'

const stateWith = (patch: Partial<ReplayState>): ReplayState => ({
  ...createInitialState(),
  ...patch,
})

describe('taskQueueOf', () => {
  it('is empty with nothing running before any Task exists', () => {
    expect(taskQueueOf(createInitialState())).toEqual({ tasks: [], running: null })
  })

  it('lists queued Tasks in queue order with their source', () => {
    const model = taskQueueOf(
      stateWith({
        tasks: [
          { taskId: 'task-2', source: 'timer', dueUs: 4000 },
          { taskId: 'task-3', source: 'port-message' },
        ],
      }),
    )
    expect(model.tasks).toEqual([
      { taskId: 'task-2', source: 'timer' },
      { taskId: 'task-3', source: 'port-message' },
    ])
  })

  it('shows the running Task with the source it was queued from', () => {
    const model = taskQueueOf(
      stateWith({ currentTask: 'task-3', currentTaskSource: 'port-message' }),
    )
    expect(model.running).toEqual({ taskId: 'task-3', source: 'port-message' })
  })
})
