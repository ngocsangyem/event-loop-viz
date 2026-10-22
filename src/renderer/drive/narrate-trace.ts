import type { CallbackInfo, Trace, TraceEvent } from '../../trace/trace-event'
import type { DriveTarget } from './drive-step'
import { builtinShown, callNameOf } from './narrated-builtins'
import { collapseLoops } from './collapse-loop-calls'
import { codeLineOf } from './narrated-step'
import type { NarratedStep, NarrationKind, NarrationParams } from './narrated-step'

export type { NarratedStep, NarrationKind, NarrationParams }

interface Frame {
  label: string
  builtin: boolean
  line: number | undefined
}

const numberOf = (id: string) => id.replace(/^\D+/, '')
const lineOf = (info: CallbackInfo | undefined) => info?.loc?.line

/**
 * Walks the Trace and turns every move a learner can see into a step: the Script and each
 * function the Script calls going on the call stack (built-ins included when the Script calls
 * them by name), what they print, schedule or queue, each Checkpoint and Job, each Task the event
 * loop takes and its callback going on the call stack, and how the Run ends. Engine-internal
 * frames, pops and bookkeeping are left out; a built-in called over and over in a loop is one
 * step with its count. Pure: the same Trace always gives the same steps.
 */
export function narrateTrace(trace: Trace): NarratedStep[] {
  const source = trace.header.source.split('\n')
  const steps: NarratedStep[] = []
  const stack: Frame[] = []
  const callbacks = new Map<string, CallbackInfo | undefined>()
  const taskSources = new Map<string, string>()
  const pendingJobs = new Set<string>()
  let context: { kind: 'job' | 'task'; id: string; started: boolean } | null = null
  let scriptTask: string | null = null
  let resumeNext: 'await' | 'gen' | null = null
  let jobsRun = 0

  const add = (event: TraceEvent, kind: NarrationKind, target: DriveTarget, params: NarrationParams = {}, variant = kind, line?: number) => {
    const code = codeLineOf(event, kind, params, line)
    steps.push({ position: event.seq, kind, variant, params, target, ...(line === undefined ? {} : { line }), ...(code === undefined ? {} : { code }) })
  }

  for (const event of trace.events) {
    if (!event.visible) continue
    switch (event.k) {
      case 'task:queue':
        taskSources.set(event.taskId, event.source)
        if (event.callback) callbacks.set(event.taskId, event.callback)
        if (event.source === 'script') {
          scriptTask ??= event.taskId
          break
        }
        add(event, 'taskQueued', 'task-queue', { task: numberOf(event.taskId), line: lineOf(callbacks.get(event.taskId)) ?? '' }, `taskQueued.${event.source}`)
        break
      case 'task:begin':
        context = { kind: 'task', id: event.taskId, started: false }
        if (event.taskId !== scriptTask) {
          add(event, 'taskStart', 'event-loop', { task: numberOf(event.taskId) }, `taskStart.${taskSources.get(event.taskId) ?? 'other'}`)
        }
        break
      case 'task:end':
        if (event.taskId === scriptTask) add(event, 'scriptEnd', 'call-stack')
        context = null
        break
      case 'checkpoint:begin':
        jobsRun = 0
        add(event, 'checkpoint', 'event-loop', { jobs: pendingJobs.size }, pendingJobs.size > 0 ? 'checkpoint' : 'checkpoint.empty')
        break
      case 'checkpoint:end':
        if (jobsRun > 0) add(event, 'checkpointEnd', 'microtask-queue', { jobs: jobsRun })
        break
      case 'job:enqueue': {
        pendingJobs.add(event.jobId)
        callbacks.set(event.jobId, event.callback)
        const info = event.callback
        const variant = event.jobKind === 'thenable' ? 'jobQueued.thenable'
          : event.jobKind === 'microtask' ? 'jobQueued.microtask'
          : info?.kind === 'await' ? 'jobQueued.await'
          : info?.kind === 'function' ? (event.outcome === 'reject' ? 'jobQueued.reject' : 'jobQueued.function')
          : 'jobQueued.builtin'
        add(event, 'jobQueued', 'microtask-queue', { job: numberOf(event.jobId), line: lineOf(info) ?? '', name: info?.name ?? '' }, variant)
        break
      }
      case 'job:begin': {
        pendingJobs.delete(event.jobId)
        jobsRun++
        context = { kind: 'job', id: event.jobId, started: false }
        // A Job whose callback is a built-in pushes no frame of the Script: it still gets a step.
        const end = trace.events.findIndex((e) => e.seq > event.seq && e.k === 'job:end' && e.jobId === event.jobId)
        const runsScriptCode = trace.events
          .slice(event.seq + 1, end === -1 ? undefined : end)
          .some((e) => e.visible && e.k === 'frame:push' && !e.builtin && e.label !== 'script')
        if (!runsScriptCode) add(event, 'builtinJob', 'microtask-queue', { job: numberOf(event.jobId) })
        break
      }
      case 'await:resume':
        resumeNext = 'await'
        break
      case 'asyncgen:resume':
        resumeNext = 'gen'
        break
      case 'frame:push': {
        const parent = stack[stack.length - 1]
        stack.push({ label: event.label, builtin: event.builtin, line: event.loc?.line })
        if (event.label === 'script') {
          if (steps.length === 0) add(event, 'scriptStart', 'call-stack')
          break
        }
        if (event.builtin) {
          const line = event.loc?.line
          const text = line ? (source[line - 1] ?? '') : ''
          if (!parent || parent.builtin || !builtinShown(event.label, text)) break
          add(event, 'builtinCall', 'call-stack', { name: callNameOf(event.label, text), line: line ?? '', count: 1 })
          break
        }
        // An engine detail: an async function's body is a second frame of the same function on top of its call.
        if (parent && !parent.builtin && parent.label === event.label && parent.line === event.loc?.line && !resumeNext) break
        if (resumeNext) {
          add(event, resumeNext === 'gen' ? 'genResume' : 'resume', 'call-stack', { name: event.label })
          resumeNext = null
          if (context) context.started = true
          break
        }
        if (context && !context.started && context.id !== scriptTask) {
          context.started = true
          const info = callbacks.get(context.id)
          add(event, 'callbackStart', 'call-stack', {
            who: context.kind,
            id: numberOf(context.id),
            line: lineOf(info) ?? '',
            name: event.label,
          }, `callbackStart.${context.kind}`)
          break
        }
        add(event, 'call', 'call-stack', { name: event.label, line: event.loc?.line ?? '' })
        break
      }
      case 'frame:pop':
        stack.pop()
        break
      case 'console':
        add(event, 'console', 'console', { text: event.text, level: event.level })
        break
      case 'timer:init':
        callbacks.set(event.taskId, event.callback)
        add(event, 'timer', 'web-apis', {
          ms: event.clampedMs,
          requested: event.requestedMs,
          nesting: event.nesting,
          line: lineOf(event.callback) ?? '',
        }, event.clampedMs !== event.requestedMs ? 'timer.clamped' : event.repeat ? 'timer.repeat' : 'timer')
        break
      case 'webapi:start':
        if (event.taskId !== undefined) callbacks.set(event.taskId, event.callback)
        add(event, 'webApi', 'web-apis', { detail: event.detail ?? '' }, `webApi.${event.api}`)
        break
      case 'render:frame':
        add(event, 'frame', 'event-loop', { count: event.callbacks, ms: event.frameMs })
        break
      case 'await:suspend': {
        const top = stack[stack.length - 1]
        add(event, 'await', 'call-stack', { name: top?.label ?? '' }, 'await', event.loc?.line)
        break
      }
      case 'asyncgen:yield':
        add(event, 'genYield', 'microtask-queue')
        break
      case 'promise:settle':
        if (event.state === 'rejected') add(event, 'rejected', 'source', {}, 'rejected', event.loc?.line)
        break
      case 'rejection:notify':
        add(event, 'rejectionReport', 'console', { message: event.message }, `rejectionReport.${event.outcome}`)
        break
      case 'exception:report':
        add(event, 'exception', 'console', { message: event.message })
        break
      case 'run:halted':
        add(event, 'halt', event.reason === 'natural' ? 'event-loop' : 'source', { reason: event.reason, limit: event.limit ?? '' }, event.reason === 'natural' ? 'halt.natural' : 'halt.budget', event.loc?.line)
        break
      default:
        break
    }
  }
  return collapseLoops(steps)
}
