import { deriveObservableOutput } from '../trace/derive-observable-output'
import { finalizeEvents } from './finalize-events'
import { TRACE_SCHEMA_VERSION } from '../trace/trace-event'
import type { HaltReason, Trace } from '../trace/trace-event'
import type { ObservableOutput } from '../trace/observable-output'
import type { EngineAdapter, UncaughtError } from './engine-adapter'
import { BudgetHalt } from './budget-meter'
import { createSeededRandom } from './seeded-random'
import { createHostTaskQueue } from './host-task-queue'
import { createRejectionTracker } from './rejection-tracker'
import { createTimingSensitivityTracker } from './timing-sensitivity'
import { createHostRunContext } from './host-run-context'
import type { HostSettings } from './host-run-context'
import { createTimerScheduler } from './timer-scheduler'
import { createAnimationFrameScheduler } from './animation-frame-scheduler'
import { createCheckpointRunner } from './checkpoint-and-notifications'
import { createEngineHooks } from './engine-event-hooks'
import { createTaskLoop } from './task-loop'
import { HTML_LOOP, HTML_REPORT } from './host-spec-references'

export type { HostSettings } from './host-run-context'

export interface EngineIdentity {
  commit: string
  patch: string
}

export type HostRunResult =
  | { kind: 'ran'; trace: Trace; observableOutput: ObservableOutput }
  | { kind: 'syntax-error'; message: string; line: number; column: number }

/**
 * The HTML event loop for Host Profile chrome-155: a script Task, timers, message, network and
 * cleanup task sources, rendering opportunities for animation-frame callbacks, and Checkpoints.
 * Time is virtual: it advances only by evaluated nodes and by jumping to the next due work.
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
  const hostTasks = createHostTaskQueue(ctx, nextOrder)
  const frames = createAnimationFrameScheduler(ctx)
  const rejections = createRejectionTracker()
  const timing = createTimingSensitivityTracker()
  const jobEnqueueSeq = new Map<string, number>()

  /** Reports an uncaught exception (HTML report the exception); the engine then fires `error`. */
  const report = (error: UncaughtError) =>
    emit(
      {
        k: 'exception:report',
        origin: error.origin,
        message: error.message,
        ...(error.unsupportedApi && { unsupportedApi: error.unsupportedApi }),
      },
      HTML_REPORT,
    )

  const { checkpoint, queueNotification, runNotification } = createCheckpointRunner(
    ctx,
    engine,
    rejections,
    jobEnqueueSeq,
    report,
  )

  engine.start(
    {
      setTimer: timers.set,
      clearTimer: timers.clear,
      queueTask: hostTasks.queue,
      startWebApi: ctx.startWebApi,
      requestAnimationFrame: frames.request,
      cancelAnimationFrame(id) {
        const opId = frames.cancel(id)
        if (opId !== undefined) emit({ k: 'webapi:cancel', opId }, frames.ref)
      },
      reportException: report,
      writeConsole(level, text) {
        emit({ k: 'console', level, text }, HTML_LOOP)
      },
      random: createSeededRandom(settings.randomSeed),
      virtualNowMs: () => clock.nowUs / 1000,
      liveCallbacks: () => [...timers.handles(), ...hostTasks.handles(), ...frames.handles()],
    },
    createEngineHooks(ctx, rejections, jobEnqueueSeq, (rejected) =>
      queueNotification(rejected, 'handled'),
      () => {
        timers.queueDue(clock.nowUs)
        hostTasks.queueDue(clock.nowUs)
      },
    ),
  )

  let sourceType: 'script' | 'module' = 'script'
  const header = {
    schemaVersion: TRACE_SCHEMA_VERSION as 3,
    engine: { name: 'engine262' as const, ...identity },
    hostProfile: settings.hostProfile,
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
    const traceHeader = { ...header, timingSensitive: timing.timingSensitive, sourceType }
    return { kind: 'ran', trace: { header: traceHeader, events }, observableOutput: deriveObservableOutput(events) }
  }

  /** Runs the Script as the first Task, then its Checkpoint. */
  function runScriptTask(): HostRunResult | undefined {
    emit({ k: 'run:start' }, HTML_LOOP)
    const scriptTaskId = ctx.newTaskId()
    emit({ k: 'task:queue', taskId: scriptTaskId, source: 'script' }, HTML_LOOP)
    emit({ k: 'task:begin', taskId: scriptTaskId }, HTML_LOOP)
    const scriptStartUs = clock.nowUs
    const outcome = engine.evaluateScript(script, report)
    if (outcome.kind === 'syntax-error') return outcome
    sourceType = outcome.sourceType
    emit({ k: 'task:end', taskId: scriptTaskId }, HTML_LOOP)
    checkpoint('script-end')
    timing.taskEnded(scriptStartUs, clock.nowUs, timers.pendingDueUs())
    return undefined
  }

  const loop = createTaskLoop({ ctx, engine, timers, hostTasks, frames, rejections, timing, checkpoint, runNotification, report })

  try {
    const syntaxError = runScriptTask()
    if (syntaxError) return syntaxError
    loop.drain()
    return finish('natural')
  } catch (error) {
    if (error instanceof BudgetHalt) return finish(error.reason, error.limit)
    throw error
  }
}
