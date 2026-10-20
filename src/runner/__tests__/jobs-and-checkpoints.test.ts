// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { Trace } from '../../trace/trace-event'

async function traceOf(script: string): Promise<Trace> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.trace
}

/** Compact view of Checkpoint and Job structure: `enqueue:1`, `begin:1`, `end:1`, `cp[script-end]`... */
function jobFlow(trace: Trace): string[] {
  const flow: string[] = []
  for (const e of trace.events) {
    if (e.k === 'job:enqueue') flow.push(`enqueue:${e.jobId}`)
    else if (e.k === 'job:begin') flow.push(`begin:${e.jobId}`)
    else if (e.k === 'job:end') flow.push(`end:${e.jobId}`)
    else if (e.k === 'checkpoint:begin') flow.push(`cp[${e.reason}`)
    else if (e.k === 'checkpoint:end') flow.push(`]${e.reason}`)
  }
  return flow
}

describe('Jobs and Checkpoints', () => {
  it('runs queueMicrotask callbacks and promise reactions in one FIFO queue', async () => {
    const result = await runScript(`
      queueMicrotask(() => console.log('qm1'));
      Promise.resolve().then(() => console.log('then'));
      queueMicrotask(() => console.log('qm2'));
    `)
    if (result.kind !== 'ran') throw new Error('expected a finished run')
    expect(result.observableOutput.map((o) => (o.kind === 'console' ? o.text : o.kind))).toEqual([
      'qm1',
      'then',
      'qm2',
    ])
  })

  it('records enqueue, begin and end for each Job inside the Checkpoint that drains it', async () => {
    const trace = await traceOf(`
      queueMicrotask(() => {});
      Promise.resolve().then(() => {});
    `)
    expect(jobFlow(trace)).toEqual([
      'enqueue:job-1',
      'enqueue:job-2',
      'cp[script-end',
      'begin:job-1',
      'end:job-1',
      'begin:job-2',
      'end:job-2',
      ']script-end',
    ])
  })

  it('runs a Job enqueued during a Checkpoint in that same Checkpoint, after Jobs already queued', async () => {
    const trace = await traceOf(`
      Promise.resolve().then(() => { Promise.resolve().then(() => {}) });
      Promise.resolve().then(() => {});
      setTimeout(() => {}, 0);
    `)
    const scriptCheckpoint = jobFlow(trace).slice(
      0,
      jobFlow(trace).indexOf(']script-end') + 1,
    )
    expect(scriptCheckpoint).toEqual([
      'enqueue:job-1',
      'enqueue:job-2',
      'cp[script-end',
      'begin:job-1',
      'enqueue:job-3', // child enqueued while job-1 runs
      'end:job-1',
      'begin:job-2',
      'end:job-2',
      'begin:job-3', // one Tick later, still inside the same Checkpoint
      'end:job-3',
      ']script-end',
    ])
  })

  it('links job:begin back to its job:enqueue and tags the kind of Job', async () => {
    const trace = await traceOf(`
      queueMicrotask(() => {});
      Promise.resolve().then(() => {});
    `)
    const enqueues = trace.events.filter((e) => e.k === 'job:enqueue')
    const begins = trace.events.filter((e) => e.k === 'job:begin')
    expect(enqueues.map((e) => (e.k === 'job:enqueue' ? e.kind : ''))).toEqual([
      'queue-microtask',
      'promise',
    ])
    expect(begins.map((e) => e.cause)).toEqual(enqueues.map((e) => e.seq))
  })

  it('reports an exception thrown by a queueMicrotask callback and keeps draining', async () => {
    const trace = await traceOf(`
      queueMicrotask(() => { throw new Error('boom') });
      queueMicrotask(() => console.log('after'));
    `)
    const exceptions = trace.events.filter((e) => e.k === 'exception:report')
    expect(exceptions).toMatchObject([{ origin: 'microtask-callback', message: 'boom' }])
    expect(trace.events.filter((e) => e.k === 'job:end')).toHaveLength(2)
  })

  it('rejects a non-function queueMicrotask argument with a TypeError', async () => {
    const result = await runScript(`queueMicrotask(1)`)
    if (result.kind !== 'ran') throw new Error('expected a finished run')
    expect(result.observableOutput).toEqual([
      { kind: 'uncaught-exception', message: expect.stringContaining('queueMicrotask') },
    ])
  })
})
