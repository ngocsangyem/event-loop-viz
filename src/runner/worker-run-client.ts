import type { RunResult, RunSettings } from './run-script'

/** The slice of the browser Worker API the client uses; lets tests supply the thread boundary. */
export interface WorkerLike {
  onmessage: ((event: { data: RunResult }) => void) | null
  onerror: ((event: { message: string }) => void) | null
  postMessage(message: unknown): void
  terminate(): void
}

export type WorkerRunOutcome = RunResult | { kind: 'cancelled' }

export interface WorkerRun {
  result: Promise<WorkerRunOutcome>
  /** Terminates the Worker; `result` resolves as `cancelled`. No Trace exists for a cancelled Run. */
  cancel(): void
}

export interface WorkerRunOptions {
  /** Wall-clock limit after which a stuck Worker is terminated (spec: 30 s). */
  watchdogMs?: number
  createWorker?: () => WorkerLike
}

export const DEFAULT_WATCHDOG_MS = 30_000

// `new Worker(new URL(...))` is the pattern the bundler recognises to emit a separate chunk,
// which keeps engine262 out of the main bundle. Created lazily, per Run, so a terminated
// Worker never has to be reused.
const createBundledWorker = (): WorkerLike =>
  new Worker(new URL('./run-script-worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as WorkerLike

/** Main-thread counterpart of `runScript`: runs the Script in a fresh Worker with a watchdog. */
export function startWorkerRun(
  script: string,
  settings: RunSettings = {},
  options: WorkerRunOptions = {},
): WorkerRun {
  const worker = (options.createWorker ?? createBundledWorker)()
  let finish: (outcome: WorkerRunOutcome) => void = () => {}
  let fail: (error: Error) => void = () => {}
  const result = new Promise<WorkerRunOutcome>((resolve, reject) => {
    finish = resolve
    fail = reject
  })

  const watchdog = setTimeout(
    () => settle({ kind: 'watchdog-killed' }),
    options.watchdogMs ?? DEFAULT_WATCHDOG_MS,
  )
  // Every exit path releases both the timer and the Worker.
  function settle(outcome: WorkerRunOutcome) {
    clearTimeout(watchdog)
    worker.terminate()
    finish(outcome)
  }

  worker.onmessage = (event) => settle(event.data)
  worker.onerror = (event) => {
    clearTimeout(watchdog)
    worker.terminate()
    fail(new Error(event.message))
  }
  worker.postMessage({ script, settings })

  return { result, cancel: () => settle({ kind: 'cancelled' }) }
}
