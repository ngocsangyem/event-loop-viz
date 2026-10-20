// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { traceOf, eventsOf } from './trace-test-helpers'
import type { Trace, TraceEvent } from '../../trace/trace-event'

describe('promise events', () => {
  it('records create, resolve and settle for a promise resolved by its executor', async () => {
    const trace = await traceOf(`new Promise((r) => r(1))`)
    const kinds = trace.events.map((e) => e.k).filter((k) => k.startsWith('promise:'))
    expect(kinds).toEqual(['promise:create', 'promise:resolve', 'promise:settle'])
    expect(eventsOf(trace, 'promise:resolve')[0]).toMatchObject({ pid: 'p1', with: 'value' })
    expect(eventsOf(trace, 'promise:settle')[0]).toMatchObject({ pid: 'p1', state: 'fulfilled' })
  })

  it('distinguishes resolving with a value, a thenable and the promise itself', async () => {
    const trace = await traceOf(`
      new Promise((r) => r(1))
      new Promise((r) => r({ then() {} }))
      let self
      self = new Promise((r) => setTimeout(() => r(self), 0))
    `)
    expect(eventsOf(trace, 'promise:resolve').map((e) => e.with)).toEqual(['value', 'thenable', 'self'])
    expect(eventsOf(trace, 'promise:settle').map((e) => e.state)).toEqual(['fulfilled', 'rejected'])
  })

  it('records then() as a reaction, pending or not depending on the promise state', async () => {
    const trace = await traceOf(`
      new Promise(() => {}).then(() => {})
      Promise.resolve(1).then(() => {})
    `)
    expect(eventsOf(trace, 'promise:reaction').map((e) => [e.via, e.pending])).toEqual([
      ['then', true],
      ['then', false],
    ])
  })

  it('labels the reaction that await registers', async () => {
    const trace = await traceOf(`(async () => { await Promise.resolve(1) })()`)
    expect(eventsOf(trace, 'promise:reaction').map((e) => e.via)).toEqual(['await'])
  })

  it('marks a promise nobody ever observes as a Bookkeeping Event', async () => {
    const trace = await traceOf(`
      new Promise(() => {})
      new Promise((r) => r(1))
    `)
    expect(eventsOf(trace, 'promise:create').map((e) => [e.pid, e.visible])).toEqual([
      ['p1', false],
      ['p2', true],
    ])
  })

  it('uses one id per promise across promise and rejection events', async () => {
    const trace = await traceOf(`Promise.reject(new Error('x'))`)
    const create = eventsOf(trace, 'promise:create')[0]!
    const tracked = eventsOf(trace, 'rejection:track')[0]!
    expect(tracked.pid).toBe(create.pid)
  })

  it('freezes events so a Trace can be shared without copying', async () => {
    const trace = await traceOf(`Promise.resolve(1).then(() => {})`)
    expect(trace.events.every((e) => Object.isFrozen(e))).toBe(true)
  })
})

describe('cause links', () => {
  const causeOf = (trace: Trace, e: TraceEvent): TraceEvent | undefined =>
    e.cause === undefined ? undefined : trace.events[e.cause]

  it('points a Job for an already settled promise at the reaction that registered it', async () => {
    const trace = await traceOf(`Promise.resolve(1).then(() => {})`)
    const [job] = eventsOf(trace, 'job:enqueue')
    expect(causeOf(trace, job!)).toMatchObject({ k: 'promise:reaction', pid: job!.pid, pending: false })
  })

  it('points a Job for a pending promise at the settle that released it', async () => {
    const trace = await traceOf(`
      const p = new Promise((r) => setTimeout(() => r(1), 0))
      p.then(() => {})
    `)
    const [job] = eventsOf(trace, 'job:enqueue')
    expect(causeOf(trace, job!)).toMatchObject({ k: 'promise:settle', pid: job!.pid })
  })

  it('points a thenable Job at the resolve that discovered the thenable', async () => {
    const trace = await traceOf(`new Promise((r) => r({ then(f) { f(1) } }))`)
    const [job] = eventsOf(trace, 'job:enqueue')
    expect(job).toMatchObject({ jobKind: 'thenable' })
    expect(causeOf(trace, job!)).toMatchObject({ k: 'promise:resolve', pid: job!.pid, with: 'thenable' })
  })

  it('reads a thenable then getter synchronously, before the thenable Job is enqueued', async () => {
    const trace = await traceOf(`
      new Promise((r) => r({ get then() { console.log('getter'); return (f) => f(1) } }))
      console.log('after')
    `)
    const order = trace.events
      .filter((e) => e.k === 'console' || e.k === 'promise:resolve' || e.k === 'job:enqueue')
      .map((e) => (e.k === 'console' ? e.text : e.k))
    expect(order.slice(0, 4)).toEqual(['getter', 'promise:resolve', 'job:enqueue', 'after'])
    expect(eventsOf(trace, 'promise:resolve')[0]).toMatchObject({ with: 'thenable' })
  })

  it('treats a native promise as a thenable and records a thenable Job for it', async () => {
    const trace = await traceOf(`new Promise((r) => r(Promise.resolve()))`)
    expect(eventsOf(trace, 'promise:resolve').map((e) => e.with)).toContain('thenable')
    expect(eventsOf(trace, 'job:enqueue').map((e) => e.jobKind)).toEqual(['thenable', 'reaction'])
  })

  it('rejects the promise without a thenable Job when the then getter throws', async () => {
    const trace = await traceOf(`new Promise((r) => r({ get then() { throw new Error('x') } }))`)
    expect(eventsOf(trace, 'job:enqueue')).toEqual([])
    expect(eventsOf(trace, 'promise:settle').map((e) => e.state)).toEqual(['rejected'])
  })

  it('points job:begin at its job:enqueue', async () => {
    const trace = await traceOf(`Promise.resolve(1).then(() => {})`)
    const [enqueue] = eventsOf(trace, 'job:enqueue')
    const begin = trace.events.find((e) => e.k === 'job:begin')
    expect(begin!.cause).toBe(enqueue!.seq)
  })
})
