// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { RunResult } from '../run-script'
import type { TraceEvent } from '../../trace/trace-event'
import { validateTraceEvent } from '../../trace/trace-event-schema'

type Ran = Extract<RunResult, { kind: 'ran' }>

async function ran(script: string): Promise<Ran> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

const visible = (r: Ran) => r.trace.events.filter((e) => e.visible)
const kinds = (r: Ran, k: TraceEvent['k']) => r.trace.events.filter((e) => e.k === k)

describe('Trace of the host APIs', () => {
  it('conforms to the schema for every new event kind and source', async () => {
    const r = await ran(`
      // @fetch https://api.test/a 200 5ms ok
      requestAnimationFrame(() => {})
      cancelAnimationFrame(requestAnimationFrame(() => {}))
      fetch('https://api.test/a').then((x) => x.text())
      postMessage(1, '*')
      import('data:text/javascript,export default 1')
      addEventListener('message', () => {})
    `)
    for (const event of r.trace.events) expect(validateTraceEvent(event)).toEqual([])
    const sources = new Set(kinds(r, 'task:queue').map((e) => (e as Extract<TraceEvent, { k: 'task:queue' }>).source))
    expect([...sources].sort()).toEqual(['animation-frame', 'networking', 'posted-message', 'script'])
  })

  it('links a Web API operation to the Task that completes it', async () => {
    const r = await ran(`fetch('data:,x')`)
    const start = kinds(r, 'webapi:start')[0] as Extract<TraceEvent, { k: 'webapi:start' }>
    expect(start).toMatchObject({ api: 'fetch', detail: 'data:,x' })
    expect(kinds(r, 'task:queue')).toContainEqual(expect.objectContaining({ source: 'networking', opId: start.opId, taskId: start.taskId }))
  })

  it('shows the network latency of a mocked response as the due time', async () => {
    const r = await ran(`// @fetch https://api.test/a 40ms hi\nfetch('https://api.test/a')`)
    expect(kinds(r, 'webapi:start')[0]).toMatchObject({ api: 'fetch', dueUs: expect.any(Number) })
    const queued = kinds(r, 'task:queue').find((e) => (e as { source: string }).source === 'networking')!
    expect(queued.t).toBeGreaterThanOrEqual(40_000)
  })

  it('runs a frame: render:frame, then one animation-frame Task per callback', async () => {
    const r = await ran(`requestAnimationFrame(() => {}); requestAnimationFrame(() => {})`)
    const frame = kinds(r, 'render:frame')[0]!
    expect(frame).toMatchObject({ callbacks: 2, frameMs: 4 })
    const after = r.trace.events.filter((e) => e.seq > frame.seq && e.k === 'task:queue')
    expect(after.map((e) => (e as { source: string }).source)).toEqual(['animation-frame', 'animation-frame'])
  })

  it('cancels a callback already queued in its frame', async () => {
    const r = await ran(`
      let b
      requestAnimationFrame(() => cancelAnimationFrame(b))
      b = requestAnimationFrame(() => console.log('never'))
    `)
    expect(kinds(r, 'webapi:cancel')).toHaveLength(1)
    expect(kinds(r, 'task:begin')).toHaveLength(2)
    expect(r.observableOutput).toEqual([])
  })

  it('checkpoints between the listeners of an event the loop fires, not after the last', async () => {
    const r = await ran(`
      addEventListener('message', () => Promise.resolve())
      addEventListener('message', () => Promise.resolve())
      postMessage(0, '*')
    `)
    const reasons = kinds(r, 'checkpoint:begin').map((e) => (e as { reason: string }).reason)
    expect(reasons).toEqual(['script-end', 'callback-end', 'task-end'])
  })

  it('reports a listener that throws inside dispatchEvent as an event-listener exception', async () => {
    const r = await ran(`
      const t = new EventTarget()
      t.addEventListener('x', () => { throw new Error('boom') })
      t.dispatchEvent(new Event('x'))
    `)
    expect(kinds(r, 'exception:report')).toMatchObject([{ origin: 'event-listener', message: 'boom' }])
  })

  it('records module Scripts in the header', async () => {
    expect((await ran(`export {}; await null`)).trace.header.sourceType).toBe('module')
    expect((await ran(`console.log(1)`)).trace.header.sourceType).toBe('script')
  })

  it('reports the syntax error of the parse that got further', async () => {
    const result = await runScript(`import x from 'data:text/javascript,'\nlet = ;`)
    expect(result).toMatchObject({ kind: 'syntax-error', line: 2 })
  })

  it('marks a Run with a timer near a rendering opportunity as timing-sensitive', async () => {
    expect((await ran(`requestAnimationFrame(() => {}); setTimeout(() => {}, 4)`)).trace.header.timingSensitive).toBe(true)
    expect((await ran(`requestAnimationFrame(() => {}); setTimeout(() => {}, 20)`)).trace.header.timingSensitive).toBe(false)
  })

  it('shows no Web API card for a callback-free Run', async () => {
    const r = await ran(`console.log(1)`)
    expect(visible(r).some((e) => e.k === 'webapi:start' || e.k === 'render:frame')).toBe(false)
  })
})
