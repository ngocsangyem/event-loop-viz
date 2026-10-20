import * as E from '@engine262/engine262'
import type { JobKind } from '../trace/trace-event'
import { promiseJobDescriptor } from './promise-job-descriptor'
import type { EngineJob } from './engine262-types'
import type { EngineRunState } from './engine-run-state'

/** FIFO microtask queue that tells the host about every Job as it is enqueued. */
export function createReportingJobQueue(state: EngineRunState, promiseId: (promise: object) => string) {
  let jobCounter = 0
  const jobIds = new WeakMap<EngineJob, string>()
  const nextJobId = () => `job-${++jobCounter}`

  class ReportingJobQueue extends E.BasicJobQueue {
    enqueueTracked(job: EngineJob, jobKind: JobKind, pid?: string, outcome?: 'fulfill' | 'reject') {
      const jobId = nextJobId()
      jobIds.set(job, jobId)
      super.enqueuePromiseJob(job)
      state.hooks.onJobEnqueue(jobId, jobKind, pid, outcome)
    }
    override enqueuePromiseJob(job: EngineJob) {
      const d = promiseJobDescriptor(job, promiseId)
      this.enqueueTracked(job, d.jobKind, d.pid, d.outcome)
    }
  }

  return { jobQueue: new ReportingJobQueue(), jobIds, nextJobId }
}

export type ReportingJobQueue = ReturnType<typeof createReportingJobQueue>['jobQueue']
