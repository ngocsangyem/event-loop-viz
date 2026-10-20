import type { ObservableOutput } from '../trace/observable-output'

export interface RunResult {
  observableOutput: ObservableOutput
}

export class EngineNotImplementedError extends Error {
  constructor() {
    super('runScript: the engine is not implemented yet')
    this.name = 'EngineNotImplementedError'
  }
}

/** Runs a Script to Halt under the simulated event loop (ADR-0001, ADR-0003). */
export async function runScript(_script: string): Promise<RunResult> {
  throw new EngineNotImplementedError()
}
