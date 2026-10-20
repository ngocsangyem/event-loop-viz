import { deriveObservableOutput } from '../trace/derive-observable-output'
import { finalizeEvents } from './finalize-events'
import { TRACE_SCHEMA_VERSION } from '../trace/trace-event'
import type { HaltReason, Trace } from '../trace/trace-event'
import type { ObservableOutput } from '../trace/observable-output'
import type { CallbackHandle, EngineAdapter } from './engine-adapter'
import { BudgetHalt } from './budget-meter'
import { createSeededRandom } from './seeded-random'
import { createPortMessageTasks, enqueuedBefore } from './port-message-tasks'
import { createRejectionTracker } from './rejection-tracker'
import { createTimingSensitivityTracker } from './timing-sensitivity'
import { createHostRunContext } from './host-run-context'
import type { HostSettings } from './host-run-context'
import { createTimerScheduler } from './timer-scheduler'
import { createCheckpointRunner } from './checkpoint-and-notifications'
import { createEngineHooks } from './engine-event-hooks'
import { HTML_LOOP, HTML_PORT_MESSAGE, HTML_REPORT, HTML_TIMERS } from './host-spec-references'

export type { HostSettings } from './host-run-context'

export interface EngineIdentity {
  commit: string
  patch: string
}

export type HostRunResult =
  | { kind: 'ran'; trace: Trace; observableOutput: ObservableOutput }
  | { kind: 'syntax-error'; message: string; line: number; column: number }

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
  const ctx = createHostRunContext(settings)
  const { emit, clock, events } = ctx
  let order = 0
  const nextOrder = () => ++order
  const timers = createTimerScheduler(ctx, nextOrder)
  const portMessages = createPortMessageTasks()
  const rejections = createRejectionTracker()
  const timing = createTimingSensitivityTracker()
  const jobEnqueueSeq = new Map<string, number>()
  const { checkpoint, queueNotification, runNotification } = createCheckpointRunner(
    ctx,
    engine,
    rejections,
    jobEnqueueSeq,
  )

  engine.start(
    {
      setTimer: timers.set,
      clearTimer: timers.clear,
      enqueuePortMessage(deliver) {
        const task = { taskId: ctx.newTaskId(), deliver, dueUs: clock.nowUs, order: nextOrder() }
        emit({ k: 'task:queue', taskId: task.taskId, source: 'port-message', dueUs: task.dueUs }, HTML_PORT_MESSAGE)
        portMessages.push(task)
      },
      writeConsole(level, text) {
        emit({ k: 'console', level, text }, HTML_LOOP)
      },
      random: createSeededRandom(settings.randomSeed),
      virtualNowMs: () => clock.nowUs / 1000,
    },
    createEngineHooks(ctx, rejections, jobEnqueueSeq, (rejected) =>
      queueNotification(rejected, 'handled'),
    ),
  )

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
    clock.loc = undefined
    // Bypasses the event Budget: the Halt itself always closes the Trace.
    events.push({
      seq: events.length,
      t: clock.nowUs,
      ref: HTML_LOOP,
      visible: true,
      k: 'run:halted',
      reason,
      ...(limit !== undefined && { limit }),
    })
    finalizeEvents(events)
    const traceHeader = { ...header, timingSensitive: timing.timingSensitive }
    return { kind: 'ran', trace: { header: traceHeader, events }, observableOutput: deriveObservableOutput(events) }
  }

  /** Reports an uncaught error from a Script or Task callback (HTML report the exception). */
  const reportUncaught = (
    origin: 'script' | 'task-callback',
    outcome: { message: string; unsupportedApi?: string },
  ) =>
    emit(
      {
        k: 'exception:report',
        origin,
        message: outcome.message,
        ...(outcome.unsupportedApi && { unsupportedApi: outcome.unsupportedApi }),
      },
      HTML_REPORT,
    )

  /** Runs the Script as the first Task, then its Checkpoint. */
  function runScriptTask(): HostRunResult | undefined {
    emit({ k: 'run:start' }, HTML_LOOP)
    const scriptTaskId = ctx.newTaskId()
    emit({ k: 'task:queue', taskId: scriptTaskId, source: 'script' }, HTML_LOOP)
    emit({ k: 'task:begin', taskId: scriptTaskId }, HTML_LOOP)
    const scriptStartUs = clock.nowUs
    const outcome = engine.evaluateScript(script)
    if (outcome.kind === 'syntax-error') return outcome
    if (outcome.kind === 'threw') reportUncaught('script', outcome)
    emit({ k: 'task:end', taskId: scriptTaskId }, HTML_LOOP)
    checkpoint('script-end')
    timing.taskEnded(scriptStartUs, clock.nowUs, timers.pendingDueUs())
    return undefined
  }

  /**
   * Picks and runs the next Task across sources until none remain: a rejection notification
   * Task, a port message, or the earliest timer, jumping the Virtual Clock to its due time.
   */
  function drainTasks() {
    for (;;) {
      const nextTimer = timers.next()
      const nextMessage = portMessages.peek()
      // Cross-source choice: oldest enqueue wins (Host Profile chrome-155, ADR-0010).
      const useMessage = nextMessage && (!nextTimer || enqueuedBefore(nextMessage, nextTimer))
      const nextDueUs = useMessage ? nextMessage.dueUs : nextTimer?.dueUs
      // Chrome runs a task that is already due before the notification Task; a later one waits.
      const notification = rejections.peek()
      if (notification && (nextDueUs === undefined || nextDueUs > notification.dueUs)) {
        runNotification(rejections.dequeue()!)
        continue
      }
      if (nextDueUs === undefined) break
      const taskId = useMessage ? nextMessage.taskId : nextTimer!.taskId
      if (nextDueUs > clock.nowUs) clock.nowUs = nextDueUs
      ctx.meter.checkVirtualTime(clock.nowUs)
      clock.loc = undefined
      let callback: CallbackHandle
      if (useMessage) {
        portMessages.shift()
        callback = nextMessage.deliver
        emit({ k: 'task:begin', taskId }, HTML_LOOP, true, ctx.taskQueueSeq.get(taskId))
      } else {
        const next = nextTimer!
        timers.fire(next)
        callback = next.callback
        emit({ k: 'task:begin', taskId }, HTML_LOOP, true, ctx.taskQueueSeq.get(taskId))
        emit({ k: 'timer:fire', tid: String(next.tid) }, HTML_TIMERS)
        if (next.repeat) timers.rearm(next)
      }
      const taskStartUs = clock.nowUs
      const result = engine.invokeCallback(callback)
      if (result.kind === 'threw') reportUncaught('task-callback', result)
      emit({ k: 'task:end', taskId }, HTML_LOOP)
      timers.resetNesting()
      checkpoint('task-end')
      timing.taskEnded(taskStartUs, clock.nowUs, timers.pendingDueUs())
    }
  }

  try {
    const syntaxError = runScriptTask()
    if (syntaxError) return syntaxError
    drainTasks()
    return finish('natural')
  } catch (error) {
    if (error instanceof BudgetHalt) return finish(error.reason, error.limit)
    throw error
  }
}
