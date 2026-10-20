// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { Trace } from '../../trace/trace-event'

async function traceOf(script: string): Promise<Trace> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.trace
}

/** Rejection-related events as `kind:detail` strings, in Trace order. */
function rejectionFlow(trace: Trace): string[] {
  const flow: string[] = []
  for (const e of trace.events) {
    if (e.k === 'rejection:track') flow.push(`track:${e.op}`)
    else if (e.k === 'rejection:notify') flow.push(`notify:${e.outcome}`)
    else if (e.k === 'task:queue' && e.source === 'dom-manipulation') flow.push('queue-notify-task')
  }
  return flow
}

describe('Rejection tracking', () => {
  it('queues one notification Task per rejection that is still unhandled after the Checkpoint', async () => {
    const trace = await traceOf(`Promise.reject(new Error('a')); Promise.reject(new Error('b'))`)
    expect(rejectionFlow(trace)).toEqual([
      'track:reject',
      'track:reject',
      'queue-notify-task',
      'queue-notify-task',
      'notify:unhandled',
      'notify:unhandled',
    ])
  })

  it('does not notify when a handler is attached within the same Checkpoint', async () => {
    const trace = await traceOf(
      `const p = Promise.reject(new Error('a')); Promise.resolve().then(() => p.catch(() => {}))`,
    )
    expect(rejectionFlow(trace)).toEqual(['track:reject', 'track:handle'])
  })

  it('fires rejection-handled as its own Task when the handler arrives after notification', async () => {
    const trace = await traceOf(
      `const p = Promise.reject(new Error('a')); setTimeout(() => p.catch(() => {}), 10)`,
    )
    expect(rejectionFlow(trace)).toEqual([
      'track:reject',
      'queue-notify-task',
      'notify:unhandled',
      'track:handle',
      'queue-notify-task',
      'notify:handled',
    ])
  })

  it('reports an exception from a Job without ending the Checkpoint', async () => {
    const trace = await traceOf(
      `queueMicrotask(() => { throw new Error('boom') }); queueMicrotask(() => console.log('next'))`,
    )
    const kinds = trace.events.filter((e) => e.k === 'exception:report' || e.k === 'console')
    expect(kinds.map((e) => e.k)).toEqual(['exception:report', 'console'])
  })
})
