import type { QueuedJob, ReplayState } from '../../player/replay-state'

type JobKind = QueuedJob['jobKind']

export interface JobTokenModel {
  jobId: string
  kind: JobKind
}

export interface JobQueueModel {
  /** Queued Jobs, head (next to run) first. */
  jobs: JobTokenModel[]
  /** The Job on the run pad, if one is running. */
  running: JobTokenModel | null
}

/** What the microtask-queue part shows for one ReplayState: pure data, no geometry. */
export function jobQueueOf(state: ReplayState): JobQueueModel {
  const jobs = state.jobs.map((job): JobTokenModel => ({ jobId: job.jobId, kind: job.jobKind }))
  const running =
    state.currentJob !== null && state.currentJobKind !== null
      ? { jobId: state.currentJob, kind: state.currentJobKind }
      : null
  return { jobs, running }
}
