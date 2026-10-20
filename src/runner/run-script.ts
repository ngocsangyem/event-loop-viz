import { createEngine262Adapter, ENGINE262_COMMIT, ENGINE262_PATCH } from '../engine/engine262-adapter'
import { scanUnsupportedApis } from './unsupported-api-scan'
import { runHost } from '../host/event-loop-host'
import type { HostSettings } from '../host/event-loop-host'
import type { ObservableOutput } from '../trace/observable-output'
import type { Trace, TraceBudgets } from '../trace/trace-event'

export type RunResult =
  | { kind: 'ran'; trace: Trace; observableOutput: ObservableOutput }
  | { kind: 'syntax-error'; message: string; line: number; column: number }
  | { kind: 'watchdog-killed' }

export interface RunSettings {
  budgets?: Partial<TraceBudgets>
  /** Virtual Clock cost per evaluated node, in microseconds. */
  nodeCostUs?: number
  randomSeed?: number
}

export const DEFAULT_BUDGETS: TraceBudgets = {
  nodes: 2_000_000,
  tasks: 10_000,
  virtualMs: 60_000,
  events: 200_000,
}

/** Runs a Script to Halt under the simulated event loop (ADR-0001, ADR-0003). */
export async function runScript(script: string, settings: RunSettings = {}): Promise<RunResult> {
  const hostSettings: HostSettings = {
    nodeCostUs: settings.nodeCostUs ?? 1,
    randomSeed: settings.randomSeed ?? 0,
    budgets: { ...DEFAULT_BUDGETS, ...settings.budgets },
  }
  return runHost(
    createEngine262Adapter(),
    script,
    hostSettings,
    {
      commit: ENGINE262_COMMIT,
      patch: ENGINE262_PATCH,
    },
    scanUnsupportedApis(script),
  )
}
