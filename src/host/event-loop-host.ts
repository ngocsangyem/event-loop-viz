import { deriveObservableOutput } from '../trace/derive-observable-output'
import { TRACE_SCHEMA_VERSION } from '../trace/trace-event'
import type {
  SourceLocation,
  HaltReason,
  Trace,
  TraceBudgets,
  TraceEvent,
  TraceEventBody,
} from '../trace/trace-event'
import type { ObservableOutput } from '../trace/observable-output'
import type { CallbackHandle, EngineAdapter } from './engine-adapter'
import { BudgetHalt, createBudgetMeter } from './budget-meter'
import { createSeededRandom } from './seeded-random'
import { createRejectionTracker } from './rejection-tracker'
import type { NotificationTask } from './rejection-tracker'
import { createTimingSensitivityTracker } from './timing-sensitivity'

export interface HostSettings {
  nodeCostUs: number
  randomSeed: number
  budgets: TraceBudgets
}

export interface EngineIdentity {
  commit: string
  patch: string
}

export type HostRunResult =
  | { kind: 'ran'; trace: Trace; observableOutput: ObservableOutput }
  | { kind: 'syntax-error'; message: string; line: number; column: number }

interface PendingTimer {
  tid: number
  callback: CallbackHandle
  delayMs: number
  repeat: boolean
  taskId: string
  dueUs: number
  order: number
  nesting: number
}

const HTML_LOOP = 'HTML:#event-loop-processing-model'
const HTML_TIMERS = 'HTML:#timer-initialisation-steps'
const HTML_CHECKPOINT = 'HTML:#perform-a-microtask-checkpoint'
const HTML_REPORT = 'HTML:#report-the-exception'
const ES_ENQUEUE_JOB = 'ES:#sec-hostenqueuepromisejob'
const HTML_QUEUE_MICROTASK = 'HTML:#dom-queuemicrotask'
const HTML_REJECTION_TRACKER = 'HTML:#the-hostpromiserejectiontracker-implementation'
const HTML_NOTIFY_REJECTED = 'HTML:#notify-about-rejected-promises'
const ES_CONTEXTS = 'ES:#sec-execution-contexts'

/** Nesting level above which Chrome clamps timers to 4 ms (HTML timer initialization steps). */
const NESTING_CLAMP_LEVEL = 5
const NESTING_CLAMP_MIN_MS = 4

/**
 * The HTML event loop for Host Profile chrome-155, restricted to a script Task,
 * a timer task source and Checkpoints. Time is virtual: it advances only by
 * evaluated nodes and by jumping to the next due timer.
 */
export function runHost(
  engine: EngineAdapter,
  script: string,
  settings: HostSettings,
  identity: EngineIdentity,
  unsupportedApis: string[] = [],
): HostRunResult {
  const events: TraceEvent[] = []
  let nowUs = 0
  let loc: SourceLocation | undefined
  let taskCounter = 0
  let timerCounter = 0
  let order = 0
  let currentNesting = 0
  const timers = new Map<number, PendingTimer>()
  const meter = createBudgetMeter(settings.budgets)
  const rejections = createRejectionTracker()
  const timing = createTimingSensitivityTracker()
  const pendingDueUs = () => [...timers.values()].map((t) => t.dueUs)

  /** seq of each Job's job:enqueue event, so job:begin can point back to it. */
  const jobEnqueueSeq = new Map<string, number>()

  const emit = (
    body: TraceEventBody,
    ref: TraceEvent['ref'],
    visible = true,
    cause?: number,
  ) => {
    // Engine frames unwinding after a Halt must not append to the Trace.
    if (meter.tripped) return
    meter.checkEvents(events.length)
    events.push({
      seq: events.length,
      t: nowUs,
      ref,
      visible,
      ...(loc && { loc }),
      ...(cause !== undefined && { cause }),
      ...body,
    })
  }
  const newTaskId = () => {
    meter.countTask()
    return `task-${++taskCounter}`
  }

  engine.start(
    {
      setTimer(callback, delayMs, repeat) {
        return initTimer(callback, delayMs, repeat, ++timerCounter)
      },
      clearTimer(id) {
        if (timers.delete(id)) emit({ k: 'timer:clear', tid: String(id) }, HTML_TIMERS)
      },
      writeConsole(level, text) {
        emit({ k: 'console', level, text }, HTML_LOOP)
      },
      random: createSeededRandom(settings.randomSeed),
      virtualNowMs: () => nowUs / 1000,
    },
    {
      onNode(nodeLoc) {
        loc = nodeLoc
        meter.countNode()
        nowUs += settings.nodeCostUs
        meter.checkVirtualTime(nowUs)
      },
      onFramePush: (f) => emit({ k: 'frame:push', ...f }, ES_CONTEXTS),
      onFramePop: (f) => emit({ k: 'frame:pop', ...f }, ES_CONTEXTS),
      onJobEnqueue(jobId, kind) {
        jobEnqueueSeq.set(jobId, events.length)
        emit(
          { k: 'job:enqueue', jobId, kind },
          kind === 'queue-microtask' ? HTML_QUEUE_MICROTASK : ES_ENQUEUE_JOB,
        )
      },
      onRejectionTrack(pid, op, message) {
        emit({ k: 'rejection:track', pid, op }, HTML_REJECTION_TRACKER, false)
        const handledLater = rejections.track(pid, op, message)
        if (handledLater) queueNotification(handledLater, 'handled')
      },
    },
  )

  function queueNotification(
    rejected: { pid: string; message: string },
    outcome: NotificationTask['outcome'],
  ) {
    const task: NotificationTask = { ...rejected, taskId: newTaskId(), dueUs: nowUs, outcome }
    emit(
      { k: 'task:queue', taskId: task.taskId, source: 'dom-manipulation' },
      HTML_NOTIFY_REJECTED,
    )
    rejections.enqueue(task)
  }

  /** Runs a queued unhandledrejection / rejectionhandled notification as its own Task. */
  function runNotification(task: NotificationTask) {
    loc = undefined
    emit({ k: 'task:begin', taskId: task.taskId }, HTML_LOOP)
    emit(
      { k: 'rejection:notify', pid: task.pid, outcome: task.outcome, message: task.message },
      HTML_NOTIFY_REJECTED,
    )
    emit({ k: 'task:end', taskId: task.taskId }, HTML_LOOP)
    checkpoint('task-end')
  }

  function initTimer(callback: CallbackHandle, requestedMs: number, repeat: boolean, tid: number) {
    const clampedMs =
      currentNesting > NESTING_CLAMP_LEVEL && requestedMs < NESTING_CLAMP_MIN_MS
        ? NESTING_CLAMP_MIN_MS
        : requestedMs
    const nesting = currentNesting + 1
    emit(
      { k: 'timer:init', tid: String(tid), requestedMs, clampedMs, nesting, repeat },
      HTML_TIMERS,
    )
    const timer: PendingTimer = {
      tid,
      callback,
      delayMs: requestedMs,
      repeat,
      taskId: newTaskId(),
      dueUs: nowUs + clampedMs * 1000,
      order: ++order,
      nesting,
    }
    emit({ k: 'task:queue', taskId: timer.taskId, source: 'timer', dueUs: timer.dueUs }, HTML_TIMERS)
    timers.set(tid, timer)
    return tid
  }

  const checkpoint = (reason: 'task-end' | 'script-end') => {
    emit({ k: 'checkpoint:begin', reason }, HTML_CHECKPOINT)
    // Jobs enqueued while a Job runs join the back of the queue and run in this same Checkpoint.
    for (;;) {
      const jobId = engine.runNextJob(
        (id) => emit({ k: 'job:begin', jobId: id }, HTML_CHECKPOINT, true, jobEnqueueSeq.get(id)),
        (message, unsupportedApi) =>
          emit(
            {
              k: 'exception:report',
              origin: 'microtask-callback',
              message,
              ...(unsupportedApi && { unsupportedApi }),
            },
            HTML_REPORT,
          ),
      )
      if (jobId === undefined) break
      emit({ k: 'job:end', jobId }, HTML_CHECKPOINT)
    }
    // Notify about rejected promises runs after the Jobs drain (HTML perform a microtask checkpoint).
    for (const rejected of rejections.takeAboutToBeNotified()) queueNotification(rejected, 'unhandled')
    emit({ k: 'checkpoint:end', reason }, HTML_CHECKPOINT)
  }

  const header = {
    schemaVersion: TRACE_SCHEMA_VERSION as 1,
    engine: { name: 'engine262' as const, ...identity },
    hostProfile: 'chrome-155' as const,
    budgets: settings.budgets,
    nodeCostUs: settings.nodeCostUs,
    randomSeed: settings.randomSeed,
    source: script,
    unsupportedApis,
  }

  const finish = (reason: HaltReason, limit?: number): HostRunResult => {
    loc = undefined
    // Bypasses the event Budget: the Halt itself always closes the Trace.
    events.push({
      seq: events.length,
      t: nowUs,
      ref: HTML_LOOP,
      visible: true,
      k: 'run:halted',
      reason,
      ...(limit !== undefined && { limit }),
    })
    const traceHeader = { ...header, timingSensitive: timing.timingSensitive }
    return { kind: 'ran', trace: { header: traceHeader, events }, observableOutput: deriveObservableOutput(events) }
  }

  try {
  emit({ k: 'run:start' }, HTML_LOOP)

  const scriptTaskId = newTaskId()
  emit({ k: 'task:queue', taskId: scriptTaskId, source: 'script' }, HTML_LOOP)
  emit({ k: 'task:begin', taskId: scriptTaskId }, HTML_LOOP)
  const scriptStartUs = nowUs
  const outcome = engine.evaluateScript(script)
  if (outcome.kind === 'syntax-error') {
    return outcome
  }
  if (outcome.kind === 'threw') {
    emit(
      {
        k: 'exception:report',
        origin: 'script',
        message: outcome.message,
        ...(outcome.unsupportedApi && { unsupportedApi: outcome.unsupportedApi }),
      },
      HTML_REPORT,
    )
  }
  emit({ k: 'task:end', taskId: scriptTaskId }, HTML_LOOP)
  checkpoint('script-end')
  timing.taskEnded(scriptStartUs, nowUs, pendingDueUs())

  for (;;) {
    const next = [...timers.values()].sort((a, b) => a.dueUs - b.dueUs || a.order - b.order)[0]
    // Chrome runs a timer that is already due before the notification Task; a later timer waits.
    const notification = rejections.peek()
    if (notification && (!next || next.dueUs > notification.dueUs)) {
      runNotification(rejections.dequeue()!)
      continue
    }
    if (!next) break
    if (next.dueUs > nowUs) nowUs = next.dueUs
    meter.checkVirtualTime(nowUs)
    loc = undefined
    timers.delete(next.tid)
    currentNesting = next.nesting
    emit({ k: 'task:begin', taskId: next.taskId }, HTML_LOOP)
    const taskStartUs = nowUs
    emit({ k: 'timer:fire', tid: String(next.tid) }, HTML_TIMERS)
    // An interval re-arms before its callback runs (HTML timer task steps).
    if (next.repeat) initTimer(next.callback, next.delayMs, true, next.tid)
    const result = engine.invokeCallback(next.callback)
    if (result.kind === 'threw') {
      emit(
        {
          k: 'exception:report',
          origin: 'task-callback',
          message: result.message,
          ...(result.unsupportedApi && { unsupportedApi: result.unsupportedApi }),
        },
        HTML_REPORT,
      )
    }
    emit({ k: 'task:end', taskId: next.taskId }, HTML_LOOP)
    currentNesting = 0
    checkpoint('task-end')
    timing.taskEnded(taskStartUs, nowUs, pendingDueUs())
  }

  return finish('natural')
  } catch (error) {
    if (error instanceof BudgetHalt) return finish(error.reason, error.limit)
    throw error
  }
}
