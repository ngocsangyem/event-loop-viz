import { describe, expect, it } from 'vitest'
import type { TraceEvent, TraceEventBody } from '../../../trace/trace-event'
import { flowForEvent } from '../diagram-flow'

const ev = (body: TraceEventBody): TraceEvent => ({ seq: 1, t: 0, ref: 'HTML:x', visible: true, ...body }) as TraceEvent

describe('flowForEvent', () => {
  it('keeps the diagram still without an event', () => {
    expect(flowForEvent(undefined)).toMatchObject({ edges: [], lit: [], step: null })
  })

  it('registers a timer on the Web APIs', () => {
    const f = flowForEvent(ev({ k: 'timer:init', tid: 't1', requestedMs: 0, clampedMs: 0, nesting: 0, repeat: false }))
    expect(f).toMatchObject({ edges: ['register'], lit: ['webapis'] })
  })

  it('moves a posted message to the Task Queue', () => {
    const f = flowForEvent(ev({ k: 'task:queue', taskId: 'k1', source: 'port-message' }))
    expect(f).toMatchObject({ edges: ['timer-fires'], lit: ['taskq'] })
  })

  it('keeps a timer in Web APIs while its Task waits for its due time', () => {
    expect(flowForEvent(ev({ k: 'task:queue', taskId: 'k1', source: 'timer' })).edges).toEqual([])
  })

  it('lights the stack when a timer callback runs inside its Task', () => {
    expect(flowForEvent(ev({ k: 'timer:fire', tid: 't1' }))).toMatchObject({ edges: [], lit: ['stack'] })
  })

  it('runs a due timer from Web APIs through the Task Queue and the loop onto the stack', () => {
    expect(flowForEvent(ev({ k: 'task:begin', taskId: 'k1' }), 'timer')).toMatchObject({
      edges: ['timer-fires', 'next-task', 'run-task'],
      lit: ['taskq', 'loop', 'stack'],
    })
  })

  it('leaves a Script task queued from nowhere still', () => {
    expect(flowForEvent(ev({ k: 'task:queue', taskId: 'k1', source: 'script' })).edges).toEqual([])
  })

  it('runs a Task in two hops: queue to loop, loop to stack', () => {
    expect(flowForEvent(ev({ k: 'task:begin', taskId: 'k1' }))).toMatchObject({
      edges: ['next-task', 'run-task'],
      lit: ['loop', 'stack'],
      step: { key: 'runTask' },
    })
  })

  it('queues a Job from the stack', () => {
    const f = flowForEvent(ev({ k: 'job:enqueue', jobId: 'j1', jobKind: 'reaction' }))
    expect(f).toMatchObject({ edges: ['queue-job'], lit: ['microq'] })
  })

  it.each([
    ev({ k: 'promise:settle', pid: 'p1', state: 'fulfilled' }),
    ev({ k: 'promise:reaction', pid: 'p1', via: 'then', pending: false }),
    ev({ k: 'promise:reaction', pid: 'p1', via: 'then', pending: true }),
  ])('leaves the hop to the job:enqueue that follows ($k)', (event) => {
    expect(flowForEvent(event).edges).toEqual([])
  })

  it('runs a Job from the microtask queue onto the stack', () => {
    expect(flowForEvent(ev({ k: 'job:begin', jobId: 'j1' }))).toMatchObject({ edges: ['run-job'], lit: ['stack'] })
  })

  it('logs to the Console without a refusal', () => {
    const f = flowForEvent(ev({ k: 'console', level: 'error', text: 'x' }))
    expect(f).toMatchObject({ edges: ['log'], lit: ['console'] })
    expect(f.refused).toBeUndefined()
  })

  it('refuses on the log edge for an uncaught exception and an unhandled rejection', () => {
    const thrown = flowForEvent(ev({ k: 'exception:report', origin: 'script', message: 'boom' }))
    const rejected = flowForEvent(ev({ k: 'rejection:notify', pid: 'p', outcome: 'unhandled', message: 'm' }))
    for (const f of [thrown, rejected]) expect(f).toMatchObject({ edges: ['log'], lit: ['console'], refused: true })
    expect(flowForEvent(ev({ k: 'rejection:notify', pid: 'p', outcome: 'handled', message: 'm' })).edges).toEqual([])
  })

  it('lights only the stack for frames', () => {
    const push = flowForEvent(ev({ k: 'frame:push', frameId: 'f', label: 'a', builtin: false }))
    expect(push).toMatchObject({ edges: [], lit: ['stack'], step: { key: 'push', params: { label: 'a' } } })
    expect(flowForEvent(ev({ k: 'frame:pop', frameId: 'f', label: 'a', builtin: false })).lit).toEqual(['stack'])
  })

  it('lights loop and microtask queue for checkpoints and the loop for a halt', () => {
    expect(flowForEvent(ev({ k: 'checkpoint:begin', reason: 'task-end' }))).toMatchObject({ edges: [], lit: ['loop', 'microq'] })
    expect(flowForEvent(ev({ k: 'checkpoint:end', reason: 'task-end' })).lit).toEqual(['loop', 'microq'])
    expect(flowForEvent(ev({ k: 'run:halted', reason: 'natural' })).lit).toEqual(['loop'])
  })

  it('ignores bookkeeping events', () => {
    expect(flowForEvent(ev({ k: 'promise:create', pid: 'p' }))).toMatchObject({ edges: [], lit: [], step: null })
  })
})
