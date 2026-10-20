import type { TraceBudgets } from './trace-event'

/** Budgets a Run uses unless the user changes them (ADR-0004). */
export const DEFAULT_BUDGETS: TraceBudgets = {
  nodes: 2_000_000,
  tasks: 10_000,
  virtualMs: 60_000,
  events: 200_000,
}

/** Virtual Clock cost per evaluated node, in microseconds. */
export const DEFAULT_NODE_COST_US = 1
