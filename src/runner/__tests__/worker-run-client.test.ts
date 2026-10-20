import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startWorkerRun } from '../worker-run-client'
import type { WorkerLike } from '../worker-run-client'
import type { RunResult } from '../run-script'

/** A stand-in for the browser Worker: the only thing faked is the thread boundary. */
class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: RunResult }) => void) | null = null
  onerror: ((event: { message: string }) => void) | null = null
  terminated = false
  posted: unknown[] = []
  postMessage(message: unknown) {
    this.posted.push(message)
  }
  terminate() {
    this.terminated = true
  }
}

describe('startWorkerRun', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves with the Worker result and terminates the Worker', async () => {
    const worker = new FakeWorker()
    const run = startWorkerRun('1', {}, { createWorker: () => worker, watchdogMs: 1000 })
    expect(worker.posted).toEqual([{ script: '1', settings: {} }])
    worker.onmessage?.({ data: { kind: 'syntax-error', message: 'm', line: 1, column: 2 } })
    expect(await run.result).toEqual({ kind: 'syntax-error', message: 'm', line: 1, column: 2 })
    expect(worker.terminated).toBe(true)
  })

  it('reports watchdog-killed and terminates a Worker that outlives the watchdog', async () => {
    const worker = new FakeWorker()
    const run = startWorkerRun('for(;;){}', {}, { createWorker: () => worker, watchdogMs: 500 })
    await vi.advanceTimersByTimeAsync(499)
    expect(worker.terminated).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await run.result).toEqual({ kind: 'watchdog-killed' })
    expect(worker.terminated).toBe(true)
  })

  it('cancel terminates the Worker and resolves as cancelled', async () => {
    const worker = new FakeWorker()
    const run = startWorkerRun('for(;;){}', {}, { createWorker: () => worker, watchdogMs: 500 })
    run.cancel()
    expect(await run.result).toEqual({ kind: 'cancelled' })
    expect(worker.terminated).toBe(true)
  })

  it('rejects when the Worker fails to load', async () => {
    const worker = new FakeWorker()
    const run = startWorkerRun('1', {}, { createWorker: () => worker, watchdogMs: 500 })
    worker.onerror?.({ message: 'boom' })
    await expect(run.result).rejects.toThrow('boom')
    expect(worker.terminated).toBe(true)
  })
})
