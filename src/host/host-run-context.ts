import type {
  CallbackInfo,
  SourceLocation,
  TraceBudgets,
  TraceEvent,
  TraceEventBody,
  WebApiKind,
} from '../trace/trace-event'
import { createBudgetMeter } from './budget-meter'
import type { BudgetMeter } from './budget-meter'

export interface HostSettings {
  nodeCostUs: number
  randomSeed: number
  hostProfile: 'chrome-155'
  budgets: TraceBudgets
}

/**
 * State every part of one Run shares: the growing Trace, the Virtual Clock reading, the
 * source location of the node being evaluated, and the Budget meter. The host modules
 * (timers, checkpoints, engine hooks) mutate it only through these fields.
 */
export interface HostRunContext {
  readonly settings: HostSettings
  readonly events: TraceEvent[]
  readonly meter: BudgetMeter
  readonly clock: { nowUs: number; loc: SourceLocation | undefined }
  /** seq of each Task's task:queue event, so task:begin can point back to the code that scheduled it. */
  readonly taskQueueSeq: Map<string, number>
  emit(body: TraceEventBody, ref: TraceEvent['ref'], visible?: boolean, cause?: number): void
  newTaskId(): string
  /**
   * A Web API operation started: reserves the id of the Task it will queue (so the card and the
   * Task share a chip) and emits webapi:start. `delayMs` is how long it waits on the Virtual Clock.
   */
  startWebApi(op: { api: WebApiKind; callback?: CallbackInfo; detail?: string; delayMs?: number }): {
    opId: string
    taskId: string
  }
}

/** Steps the host performs itself: no Script code runs, so they carry no source location. */
const HOST_ONLY_KINDS: ReadonlySet<string> = new Set([
  'run:start',
  'run:halted',
  'task:begin',
  'task:end',
  'checkpoint:begin',
  'checkpoint:end',
  'job:begin',
  'job:end',
])

export function createHostRunContext(settings: HostSettings): HostRunContext {
  const events: TraceEvent[] = []
  const meter = createBudgetMeter(settings.budgets)
  const clock: HostRunContext['clock'] = { nowUs: 0, loc: undefined }
  const taskQueueSeq = new Map<string, number>()
  let taskCounter = 0
  let opCounter = 0

  const context: HostRunContext = {
    settings,
    events,
    meter,
    clock,
    taskQueueSeq,
    emit(body, ref, visible = true, cause) {
      // Engine frames unwinding after a Halt must not append to the Trace.
      if (meter.tripped) return
      meter.checkEvents(events.length)
      if (body.k === 'task:queue') taskQueueSeq.set(body.taskId, events.length)
      events.push({
        seq: events.length,
        t: clock.nowUs,
        ref,
        visible,
        ...(clock.loc && !HOST_ONLY_KINDS.has(body.k) && { loc: clock.loc }),
        ...(cause !== undefined && { cause }),
        ...body,
      })
    },
    newTaskId() {
      meter.countTask()
      return `task-${++taskCounter}`
    },
    startWebApi({ api, callback, detail, delayMs }) {
      const opId = `op-${++opCounter}`
      const taskId = context.newTaskId()
      context.emit(
        {
          k: 'webapi:start',
          opId,
          api,
          taskId,
          ...(delayMs !== undefined && { dueUs: clock.nowUs + delayMs * 1000 }),
          ...(callback && { callback }),
          ...(detail !== undefined && { detail }),
        },
        WEB_API_REF[api],
      )
      return { opId, taskId }
    },
  }
  return context
}

/** Spec step each kind of Web API operation starts from. */
const WEB_API_REF: Record<WebApiKind, TraceEvent['ref']> = {
  requestAnimationFrame: 'HTML:#dom-animationframeprovider-requestanimationframe',
  fetch: 'HTML:#networking-task-source',
  body: 'HTML:#networking-task-source',
  import: 'HTML:#hostloadimportedmodule',
  waitAsync: 'ES:#sec-atomics.waitasync',
}
