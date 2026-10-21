import * as E from '@engine262/engine262'
import type { CallbackInfo, JobKind } from '../trace/trace-event'
import type { DescribeCallback } from './describe-callback'
import { promiseJobDescriptor } from './promise-job-descriptor'
import type { EngineJob } from './engine262-types'
import type { EngineRunState } from './engine-run-state'
import type { AwaitSite } from './promise-event-reporters'

/** FIFO microtask queue that tells the host about every Job as it is enqueued. */
export function createReportingJobQueue(
  state: EngineRunState,
  promiseId: (promise: object) => string,
  describe: DescribeCallback,
  awaitSite: AwaitSite,
) {
  let jobCounter = 0
  const jobIds = new WeakMap<EngineJob, string>()
  const nextJobId = () => `job-${++jobCounter}`

  class ReportingJobQueue extends E.BasicJobQueue {
    enqueueTracked(
      job: EngineJob,
      info: { jobKind: JobKind; pid?: string; outcome?: 'fulfill' | 'reject'; callback?: CallbackInfo },
    ) {
      const jobId = nextJobId()
      jobIds.set(job, jobId)
      super.enqueuePromiseJob(job)
      state.hooks.onJobEnqueue({ jobId, ...info })
    }
    override enqueuePromiseJob(job: EngineJob) {
      this.enqueueTracked(job, promiseJobDescriptor(job, promiseId, describe, awaitSite))
    }
  }

  return { jobQueue: new ReportingJobQueue(), jobIds, nextJobId }
}

export type ReportingJobQueue = ReturnType<typeof createReportingJobQueue>['jobQueue']
