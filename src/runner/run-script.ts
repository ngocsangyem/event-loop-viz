import { createEngine262Adapter, ENGINE262_COMMIT, ENGINE262_PATCH } from '../engine/engine262-adapter'
import { scanUnsupportedApis } from './unsupported-api-scan'
import { runHost } from '../host/event-loop-host'
import type { HostSettings } from '../host/event-loop-host'
import type { ObservableOutput } from '../trace/observable-output'
import { DEFAULT_BUDGETS, DEFAULT_NODE_COST_US } from '../trace/default-budgets'
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
  /** The only Host Profile in v1; recorded in the Trace header. */
  hostProfile?: 'chrome-155'
}

export { DEFAULT_BUDGETS }

/** Runs a Script to Halt under the simulated event loop (ADR-0001, ADR-0003). */
export async function runScript(script: string, settings: RunSettings = {}): Promise<RunResult> {
  const hostSettings: HostSettings = {
    nodeCostUs: settings.nodeCostUs ?? DEFAULT_NODE_COST_US,
    randomSeed: settings.randomSeed ?? 0,
    hostProfile: settings.hostProfile ?? 'chrome-155',
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
