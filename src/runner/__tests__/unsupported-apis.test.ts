// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { Trace } from '../../trace/trace-event'

async function ran(script: string) {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

const reports = (trace: Trace) => trace.events.filter((e) => e.k === 'exception:report')

describe('Unsupported APIs', () => {
  it('fetch reports an UnsupportedApiError and the loop keeps running', async () => {
    const { observableOutput, trace } = await ran(
      `setTimeout(() => console.log('later'), 0); fetch('/x'); console.log('not reached')`,
    )
    expect(observableOutput).toEqual([
      {
        kind: 'uncaught-exception',
        message: 'fetch is not supported in v1',
        errorName: 'UnsupportedApiError',
      },
      { kind: 'console', level: 'log', text: 'later' },
    ])
    expect(reports(trace)).toMatchObject([{ origin: 'script', unsupportedApi: 'fetch' }])
  })

  it('requestAnimationFrame is reported as unsupported and later timers still run', async () => {
    const { observableOutput, trace } = await ran(
      `setTimeout(() => console.log('t'), 0); requestAnimationFrame(() => console.log('raf'))`,
    )
    expect(observableOutput).toEqual([
      {
        kind: 'uncaught-exception',
        message: 'requestAnimationFrame is not supported in v1',
        errorName: 'UnsupportedApiError',
      },
      { kind: 'console', level: 'log', text: 't' },
    ])
    expect(reports(trace)).toMatchObject([{ unsupportedApi: 'requestAnimationFrame' }])
  })

  it('does not tag a Script error that merely reads like an Unsupported API message', async () => {
    const { observableOutput } = await ran(`throw new Error('thing is not supported in v1')`)
    expect(observableOutput).toEqual([
      { kind: 'uncaught-exception', message: 'thing is not supported in v1' },
    ])
  })

  it('records the pre-run scan in the Trace header', async () => {
    const { trace } = await ran(`fetch('/x'); new WeakRef({})`)
    expect(trace.header.unsupportedApis).toEqual(['fetch', 'WeakRef'])
  })

  it('leaves the list empty for a supported-only Script', async () => {
    const { trace } = await ran(`console.log(1)`)
    expect(trace.header.unsupportedApis).toEqual([])
  })

  it.each([
    ['document.title', 'document'],
    ['window.x', 'window'],
    ['addEventListener("x", () => {})', 'addEventListener'],
    ['postMessage("m", "*")', 'postMessage'],
    ['new FinalizationRegistry(() => {})', 'FinalizationRegistry'],
    ['new WeakRef({})', 'WeakRef'],
    ['new SharedArrayBuffer(8)', 'SharedArrayBuffer'],
    ['Atomics.wait(new Int32Array(4), 0, 0)', 'Atomics.wait'],
  ])('%s throws UnsupportedApiError naming %s', async (script, api) => {
    const { trace } = await ran(script)
    expect(reports(trace)).toMatchObject([
      { message: `${api} is not supported in v1`, unsupportedApi: api },
    ])
  })

  it('is catchable as an Error named UnsupportedApiError', async () => {
    const { observableOutput } = await ran(
      `try { fetch('/x') } catch (e) { console.log(e.name, e instanceof Error, e.message) }`,
    )
    expect(observableOutput).toEqual([
      { kind: 'console', level: 'log', text: 'UnsupportedApiError true fetch is not supported in v1' },
    ])
  })

  it('reports from a timer callback as a task-callback exception', async () => {
    const { trace } = await ran(
      `setTimeout(() => fetch('/x'), 0); setTimeout(() => console.log('after'), 1)`,
    )
    expect(reports(trace)).toMatchObject([{ origin: 'task-callback', unsupportedApi: 'fetch' }])
  })

  it('does not set unsupportedApi on ordinary exceptions', async () => {
    const { trace } = await ran(`throw new Error('boom')`)
    expect(reports(trace)[0]).not.toHaveProperty('unsupportedApi')
  })
})
