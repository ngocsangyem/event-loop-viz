import type { JobKind } from '../trace/trace-event'

/** Job metadata attached by the engine262 patch (see patches/@engine262__engine262.patch). */
interface PromiseJobMeta {
  kind: 'reaction' | 'thenable'
  promise: object
  outcome?: 'fulfill' | 'reject'
}

export interface JobDescriptor {
  jobKind: JobKind
  pid: string
  outcome?: 'fulfill' | 'reject'
}

/**
 * Describes a promise Job from the metadata the patched engine attaches.
 * A Job without metadata means the patch is not applied: failing loudly beats
 * guessing the kind, which would silently corrupt the Trace.
 */
export function promiseJobDescriptor(
  job: { meta?: unknown },
  promiseId: (promise: object) => string,
): JobDescriptor {
  const meta = job.meta as PromiseJobMeta | undefined
  if (!meta) throw new Error('promise Job has no metadata: is the engine262 patch applied?')
  return {
    jobKind: meta.kind,
    pid: promiseId(meta.promise),
    ...(meta.outcome && { outcome: meta.outcome }),
  }
}
