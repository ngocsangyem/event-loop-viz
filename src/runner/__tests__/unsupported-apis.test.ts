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
  it('Worker reports an UnsupportedApiError and the loop keeps running', async () => {
    const { observableOutput, trace } = await ran(
      `setTimeout(() => console.log('later'), 0); new Worker('w.js'); console.log('not reached')`,
    )
    expect(observableOutput).toEqual([
      {
        kind: 'uncaught-exception',
        message: 'Worker is not supported by the simulator',
        errorName: 'UnsupportedApiError',
      },
      { kind: 'console', level: 'log', text: 'later' },
    ])
    expect(reports(trace)).toMatchObject([{ origin: 'script', unsupportedApi: 'Worker' }])
  })

  it('does not tag a Script error that merely reads like an Unsupported API message', async () => {
    const { observableOutput } = await ran(`throw new Error('thing is not supported by the simulator')`)
    expect(observableOutput).toEqual([
      { kind: 'uncaught-exception', message: 'thing is not supported by the simulator' },
    ])
  })

  it('records the pre-run scan in the Trace header', async () => {
    const { trace } = await ran(`new XMLHttpRequest(); requestIdleCallback(() => {})`)
    expect(trace.header.unsupportedApis).toEqual(['XMLHttpRequest', 'requestIdleCallback'])
  })

  it('leaves the list empty for a Script that uses only supported APIs', async () => {
    const { trace } = await ran(
      `fetch('data:,x'); requestAnimationFrame(() => {}); postMessage(1, '*'); new WeakRef({}); document.body`,
    )
    expect(trace.header.unsupportedApis).toEqual([])
  })

  it.each([
    ['new Worker("w.js")', 'Worker'],
    ['new SharedWorker("w.js")', 'SharedWorker'],
    ['new XMLHttpRequest()', 'XMLHttpRequest'],
    ['new WebSocket("wss://x.test")', 'WebSocket'],
    ['requestIdleCallback(() => {})', 'requestIdleCallback'],
  ])('%s throws UnsupportedApiError naming %s', async (script, api) => {
    const { trace } = await ran(script)
    expect(reports(trace)).toMatchObject([
      { message: `${api} is not supported by the simulator`, unsupportedApi: api },
    ])
  })

  it.each([
    ['document.body.innerHTML = "<b>x</b>"', 'innerHTML (markup)'],
    ['document.querySelector("body > script")', "querySelector('body > script')"],
    ['Atomics.waitAsync(new Int32Array(new SharedArrayBuffer(8)), 0, 0, 10)', 'Atomics.waitAsync with a timeout'],
  ])('a feature the model leaves out fails loudly at run time: %s', async (script, api) => {
    const { trace } = await ran(script)
    expect(reports(trace)).toMatchObject([{ unsupportedApi: api }])
  })

  it('is catchable as an Error named UnsupportedApiError', async () => {
    const { observableOutput } = await ran(
      `try { new Worker('w.js') } catch (e) { console.log(e.name, e instanceof Error, e.message) }`,
    )
    expect(observableOutput).toEqual([
      { kind: 'console', level: 'log', text: 'UnsupportedApiError true Worker is not supported by the simulator' },
    ])
  })

  it('reports from a timer callback as a task-callback exception', async () => {
    const { trace } = await ran(
      `setTimeout(() => new Worker('w.js'), 0); setTimeout(() => console.log('after'), 1)`,
    )
    expect(reports(trace)).toMatchObject([{ origin: 'task-callback', unsupportedApi: 'Worker' }])
  })

  it('does not set unsupportedApi on ordinary exceptions', async () => {
    const { trace } = await ran(`throw new Error('boom')`)
    expect(reports(trace)[0]).not.toHaveProperty('unsupportedApi')
  })
})
