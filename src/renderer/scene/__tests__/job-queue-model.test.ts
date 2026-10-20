import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../../player/replay-state'
import type { ReplayState } from '../../../player/replay-state'
import { jobQueueOf } from '../job-queue-model'

const stateWith = (patch: Partial<ReplayState>): ReplayState => ({
  ...createInitialState(),
  ...patch,
})

describe('jobQueueOf', () => {
  it('is empty with nothing running before any Job exists', () => {
    expect(jobQueueOf(createInitialState())).toEqual({ jobs: [], running: null })
  })

  it('lists queued Jobs head first, each labelled by its kind', () => {
    const model = jobQueueOf(
      stateWith({
        jobs: [
          { jobId: 'job-1', jobKind: 'reaction', pid: 'p1', outcome: 'fulfill' },
          { jobId: 'job-2', jobKind: 'microtask' },
          { jobId: 'job-3', jobKind: 'thenable' },
        ],
      }),
    )
    expect(model.jobs.map((j) => [j.jobId, j.kind])).toEqual([
      ['job-1', 'reaction'],
      ['job-2', 'microtask'],
      ['job-3', 'thenable'],
    ])
  })

  it('shows the running Job with the kind it had in the queue', () => {
    const model = jobQueueOf(stateWith({ currentJob: 'job-1', currentJobKind: 'reaction' }))
    expect(model.running).toEqual({ jobId: 'job-1', kind: 'reaction' })
  })

  it('has no running Job between Jobs', () => {
    expect(jobQueueOf(stateWith({ currentJob: null, currentJobKind: null })).running).toBeNull()
  })
})
