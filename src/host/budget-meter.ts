import type { HaltReason, TraceBudgets } from '../trace/trace-event'

/** Thrown through the engine when a Budget is exceeded; the host turns it into `run:halted`. */
export class BudgetHalt extends Error {
  constructor(
    readonly reason: Exclude<HaltReason, 'natural'>,
    readonly limit: number,
  ) {
    super(`budget exceeded: ${reason}`)
  }
}

/**
 * Counts every deterministic Budget. All inputs are counts or Virtual
 * Clock readings, so a Run halts at the same point every time.
 */
export interface BudgetMeter {
  /** True once any Budget has tripped; unwinding engine frames must stop emitting events. */
  readonly tripped: boolean
  countNode(): void
  countTask(): void
  checkVirtualTime(nowUs: number): void
  /** Called before appending an event; `eventCount` is the number already in the Trace. */
  checkEvents(eventCount: number): void
}

export function createBudgetMeter(budgets: TraceBudgets): BudgetMeter {
  let nodes = 0
  let tasks = 0
  let tripped = false

  const trip = (reason: Exclude<HaltReason, 'natural'>, limit: number): never => {
    tripped = true
    throw new BudgetHalt(reason, limit)
  }

  return {
    get tripped() {
      return tripped
    },
    countNode() {
      if (++nodes > budgets.nodes) trip('nodes', budgets.nodes)
    },
    countTask() {
      if (++tasks > budgets.tasks) trip('tasks', budgets.tasks)
    },
    checkVirtualTime(nowUs) {
      if (nowUs > budgets.virtualMs * 1000) trip('virtual-time', budgets.virtualMs)
    },
    checkEvents(eventCount) {
      if (eventCount >= budgets.events) trip('events', budgets.events)
    },
  }
}
