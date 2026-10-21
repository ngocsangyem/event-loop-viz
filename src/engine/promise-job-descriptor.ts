import type { CallbackInfo, JobKind } from '../trace/trace-event'
import type { DescribeCallback } from './describe-callback'
import type { EngineValue } from './engine262-types'
import type { AwaitSite } from './promise-event-reporters'

/** Job metadata attached by the engine262 patch (see patches/@engine262__engine262.patch). */
interface PromiseJobMeta {
  kind: 'reaction' | 'thenable'
  promise: object
  outcome?: 'fulfill' | 'reject'
  /** reaction: the function it calls; absent when the reaction passes the value through. */
  handler?: EngineValue
  /** reaction: the async function context an await continuation resumes. */
  asyncContext?: object
  /** thenable: the `then` method the Job calls. */
  then?: EngineValue
}

export interface JobDescriptor {
  jobKind: JobKind
  pid: string
  outcome?: 'fulfill' | 'reject'
  callback?: CallbackInfo
}

/**
 * Describes a promise Job from the metadata the patched engine attaches.
 * A Job without metadata means the patch is not applied: failing loudly beats
 * guessing the kind, which would silently corrupt the Trace.
 */
export function promiseJobDescriptor(
  job: { meta?: unknown },
  promiseId: (promise: object) => string,
  describe: DescribeCallback,
  awaitSite: AwaitSite,
): JobDescriptor {
  const meta = job.meta as PromiseJobMeta | undefined
  if (!meta) throw new Error('promise Job has no metadata: is the engine262 patch applied?')
  // An await continuation has no function of its own: it shows where the async function paused.
  const callback: CallbackInfo | undefined = meta.asyncContext
    ? awaitSite(meta.asyncContext)
    : describe(meta.kind === 'thenable' ? meta.then : meta.handler)
  return {
    jobKind: meta.kind,
    pid: promiseId(meta.promise),
    ...(meta.outcome && { outcome: meta.outcome }),
    ...(callback && { callback }),
  }
}
