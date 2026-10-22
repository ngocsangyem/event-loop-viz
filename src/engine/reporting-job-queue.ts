import * as E from '@engine262/engine262'
import type { CallbackInfo, JobKind } from '../trace/trace-event'
import type { DescribeCallback } from './describe-callback'
import { promiseJobDescriptor } from './promise-job-descriptor'
import type { EngineJob, EngineValue } from './engine262-types'
import type { EngineRunState } from './engine-run-state'
import type { AwaitSite } from './promise-event-reporters'

type Mark = (value: unknown) => void

/**
 * FIFO microtask queue that tells the host about every Job as it is enqueued. It is also where
 * engine262's `gc()` starts marking (the agent marks its job queue), so it marks what the Jobs
 * will touch and, through `markHostRoots`, everything the host holds.
 */
export function createReportingJobQueue(
  state: EngineRunState,
  promiseId: (promise: object) => string,
  describe: DescribeCallback,
  awaitSite: AwaitSite,
  markHostRoots: (m: Mark) => void,
) {
  let jobCounter = 0
  const jobIds = new WeakMap<EngineJob, string>()
  const nextJobId = () => `job-${++jobCounter}`
  /** Engine values a Job's closure holds that engine262 cannot see (the queueMicrotask callback). */
  const jobRoots = new WeakMap<EngineJob, EngineValue[]>()

  class ReportingJobQueue extends E.BasicJobQueue {
    enqueueTracked(
      job: EngineJob,
      info: { jobKind: JobKind; pid?: string; outcome?: 'fulfill' | 'reject'; callback?: CallbackInfo },
      roots?: EngineValue[],
    ) {
      const jobId = nextJobId()
      jobIds.set(job, jobId)
      if (roots) jobRoots.set(job, roots)
      super.enqueuePromiseJob(job)
      state.hooks.onJobEnqueue({ jobId, ...info })
    }
    override mark(m: Mark) {
      super.mark(m)
      for (const job of this) {
        // A reaction Job's argument is its source promise's result; the patch records that promise.
        const meta = (job as { meta?: Record<string, unknown> }).meta
        if (meta) for (const key of ['promise', 'handler', 'then', 'asyncContext']) m(meta[key])
        jobRoots.get(job)?.forEach(m)
      }
      markHostRoots(m)
    }
    override enqueuePromiseJob(job: EngineJob) {
      this.enqueueTracked(job, promiseJobDescriptor(job, promiseId, describe, awaitSite))
    }
  }

  return { jobQueue: new ReportingJobQueue(), jobIds, nextJobId }
}

export type ReportingJobQueue = ReturnType<typeof createReportingJobQueue>['jobQueue']
