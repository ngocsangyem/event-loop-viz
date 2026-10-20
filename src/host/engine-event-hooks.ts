import type { EngineHooks } from './engine-adapter'
import {
  ES_ASYNC_GENERATOR,
  ES_AWAIT,
  ES_CONTEXTS,
  ES_ENQUEUE_JOB,
  ES_FULFILL,
  ES_PERFORM_THEN,
  ES_PROMISE_CREATE,
  ES_REJECT,
  ES_RESOLVE_FUNCTIONS,
  HTML_QUEUE_MICROTASK,
  HTML_REJECTION_TRACKER,
} from './host-spec-references'
import type { HostRunContext } from './host-run-context'
import type { RejectedPromise, createRejectionTracker } from './rejection-tracker'

/**
 * The notifications the engine sends while Script code runs, translated into Trace Events:
 * node evaluation (Virtual Clock), frames, promise / await / async-generator steps, Job
 * enqueues and rejection tracking.
 */
export function createEngineHooks(
  ctx: HostRunContext,
  rejections: ReturnType<typeof createRejectionTracker>,
  /** Filled here, read by the checkpoint runner: job id -> seq of its job:enqueue event. */
  jobEnqueueSeq: Map<string, number>,
  queueHandledNotification: (rejected: RejectedPromise) => void,
): EngineHooks {
  const { emit, events, clock } = ctx
  /** The latest promise event, which is the cause of a Job enqueued right after it. */
  let lastPromiseEvent: { seq: number; pid: string } | undefined

  return {
    onNode(nodeLoc) {
      clock.loc = nodeLoc
      ctx.meter.countNode()
      clock.nowUs += ctx.settings.nodeCostUs
      ctx.meter.checkVirtualTime(clock.nowUs)
    },
    onFramePush: (f) => emit({ k: 'frame:push', ...f }, ES_CONTEXTS),
    onFramePop: (f) => emit({ k: 'frame:pop', ...f }, ES_CONTEXTS),
    onPromiseEvent(event) {
      lastPromiseEvent = { seq: events.length, pid: event.pid }
      if (event.type === 'create') emit({ k: 'promise:create', pid: event.pid }, ES_PROMISE_CREATE)
      else if (event.type === 'reaction') {
        emit({ k: 'promise:reaction', pid: event.pid, via: event.via, pending: event.pending }, ES_PERFORM_THEN)
      } else if (event.type === 'resolve') {
        emit({ k: 'promise:resolve', pid: event.pid, with: event.with }, ES_RESOLVE_FUNCTIONS)
      } else {
        emit(
          { k: 'promise:settle', pid: event.pid, state: event.state },
          event.state === 'fulfilled' ? ES_FULFILL : ES_REJECT,
        )
      }
    },
    onAwaitEvent(event) {
      if (event.type === 'suspend') emit({ k: 'await:suspend', fid: event.fid, awaitedPid: event.awaitedPid }, ES_AWAIT)
      else emit({ k: 'await:resume', fid: event.fid, mode: event.mode }, ES_AWAIT)
    },
    onAsyncGeneratorEvent(event) {
      emit({ k: `asyncgen:${event.type}`, gid: event.gid }, ES_ASYNC_GENERATOR)
    },
    onJobEnqueue(jobId, jobKind, pid, outcome) {
      jobEnqueueSeq.set(jobId, events.length)
      // The engine reports the scheduling promise event right before the Job it causes.
      const cause = pid !== undefined && lastPromiseEvent?.pid === pid ? lastPromiseEvent.seq : undefined
      emit(
        {
          k: 'job:enqueue',
          jobId,
          jobKind,
          ...(pid !== undefined && { pid }),
          ...(outcome && { outcome }),
        },
        jobKind === 'microtask' ? HTML_QUEUE_MICROTASK : ES_ENQUEUE_JOB,
        true,
        cause,
      )
    },
    onRejectionTrack(pid, op, message) {
      emit({ k: 'rejection:track', pid, op }, HTML_REJECTION_TRACKER, false)
      const handledLater = rejections.track(pid, op, message)
      if (handledLater) queueHandledNotification(handledLater)
    },
  }
}
