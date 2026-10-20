import type { TraceEvent } from '../trace/trace-event'
import type { ReplayState } from './replay-state'

/**
 * Folds one event into `state` in place. Kinds this switch does not know (added by newer
 * engines or hosts) only advance position, clock and source ranges, so old players keep
 * replaying new Traces.
 */
export function applyEvent(
  state: ReplayState,
  event: TraceEvent,
  eventAt: (seq: number) => TraceEvent | undefined,
): void {
  state.position = event.seq
  state.clockUs = event.t
  state.sourceRange = event.loc ?? null
  state.causeRange = (event.cause !== undefined ? eventAt(event.cause)?.loc : undefined) ?? null

  switch (event.k) {
    case 'task:queue':
      state.tasks.push({
        taskId: event.taskId,
        source: event.source,
        ...(event.dueUs !== undefined && { dueUs: event.dueUs }),
      })
      break
    case 'task:begin':
      state.currentTaskSource = state.tasks.find((t) => t.taskId === event.taskId)?.source ?? null
      state.tasks = state.tasks.filter((t) => t.taskId !== event.taskId)
      state.currentTask = event.taskId
      break
    case 'task:end':
      state.currentTask = null
      state.currentTaskSource = null
      break
    case 'checkpoint:begin':
      state.inCheckpoint = true
      break
    case 'checkpoint:end':
      state.inCheckpoint = false
      break
    case 'job:enqueue':
      state.jobs.push({
        jobId: event.jobId,
        jobKind: event.jobKind,
        ...(event.pid !== undefined && { pid: event.pid }),
        ...(event.outcome !== undefined && { outcome: event.outcome }),
      })
      // A Job enqueued by Script code runs in Tick 1; one enqueued by a Job in the next Tick.
      state.jobTicks[event.jobId] = (state.tick ?? 0) + 1
      break
    case 'job:begin':
      state.currentJobKind = state.jobs.find((j) => j.jobId === event.jobId)?.jobKind ?? null
      state.jobs = state.jobs.filter((j) => j.jobId !== event.jobId)
      state.currentJob = event.jobId
      state.tick = state.jobTicks[event.jobId] ?? 1
      delete state.jobTicks[event.jobId]
      break
    case 'job:end':
      state.currentJob = null
      state.currentJobKind = null
      state.tick = null
      break
    case 'frame:push':
      state.stack.push({ frameId: event.frameId, label: event.label, builtin: event.builtin })
      break
    case 'frame:pop': {
      // Pop to the matching frame so unwinding after a throw cannot leave stale frames.
      let at = state.stack.length - 1
      while (at >= 0 && state.stack[at]!.frameId !== event.frameId) at--
      if (at >= 0) state.stack.length = at
      break
    }
    case 'timer:init':
      // Re-arming an interval reuses the id, replacing its entry.
      state.timers = state.timers.filter((t) => t.tid !== event.tid)
      state.timers.push({
        tid: event.tid,
        requestedMs: event.requestedMs,
        clampedMs: event.clampedMs,
        repeat: event.repeat,
        dueUs: event.t + event.clampedMs * 1000,
      })
      break
    case 'timer:fire':
    case 'timer:clear':
      state.timers = state.timers.filter((t) => t.tid !== event.tid)
      break
    case 'promise:create':
      state.promises[event.pid] = 'pending'
      break
    case 'promise:settle':
      state.promises[event.pid] = event.state
      break
    case 'await:suspend':
      state.suspendedAwaits = state.suspendedAwaits.filter((a) => a.fid !== event.fid)
      state.suspendedAwaits.push({
        fid: event.fid,
        label: state.stack.find((f) => f.frameId === event.fid)?.label ?? event.fid,
        ...(event.awaitedPid !== undefined && { pid: event.awaitedPid }),
      })
      break
    case 'await:resume':
      state.suspendedAwaits = state.suspendedAwaits.filter((a) => a.fid !== event.fid)
      break
    case 'asyncgen:yield':
      state.asyncGens[event.gid] = 'yielded'
      break
    case 'asyncgen:resume':
      state.asyncGens[event.gid] = 'running'
      break
    case 'asyncgen:return-await':
      state.asyncGens[event.gid] = 'awaiting-return'
      break
    case 'console':
      state.console.push({ kind: 'console', level: event.level, text: event.text })
      break
    case 'exception:report':
      state.console.push({
        kind: 'uncaught-exception',
        message: event.message,
        ...(event.unsupportedApi && { errorName: 'UnsupportedApiError' as const }),
      })
      break
    case 'rejection:notify':
      state.console.push({
        kind: event.outcome === 'unhandled' ? 'unhandled-rejection' : 'rejection-handled',
        message: event.message,
      })
      break
    case 'run:halted':
      state.halted = {
        reason: event.reason,
        ...(event.limit !== undefined && { limit: event.limit }),
      }
      break
    default:
      break
  }
}
