// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { CallbackInfo, Trace } from '../../trace/trace-event'
import { eventsOf, traceOf } from './trace-test-helpers'

/** The Script text a descriptor points at. */
const textOf = (trace: Trace, info: CallbackInfo | undefined) =>
  info?.loc ? trace.header.source.slice(info.loc.start, info.loc.end) : undefined

const jobCallbacks = (trace: Trace) => eventsOf(trace, 'job:enqueue').map((e) => e.callback)

describe('timer callbacks', () => {
  it('describes a setTimeout arrow on timer:init and on its queued Task', async () => {
    const trace = await traceOf(`setTimeout(() => console.log(2), 10)`)
    const [init] = eventsOf(trace, 'timer:init')
    const queued = eventsOf(trace, 'task:queue').find((e) => e.source === 'timer')!
    expect(init!.callback?.kind).toBe('function')
    expect(textOf(trace, init!.callback)).toBe('() => console.log(2)')
    expect(queued.callback).toEqual(init!.callback)
    expect(queued.taskId).toBe(init!.taskId)
  })

  it('describes a function declaration passed by name with its whole text', async () => {
    const trace = await traceOf(`function tick() { console.log(1) }\nsetTimeout(tick, 0)`)
    const [init] = eventsOf(trace, 'timer:init')
    expect(textOf(trace, init!.callback)).toBe('function tick() { console.log(1) }')
    expect(init!.callback?.loc?.line).toBe(1)
  })

  it('records line and column in the convention of the event locations', async () => {
    const trace = await traceOf(`const a = 1\n  setTimeout(() => {}, 0)`)
    const [init] = eventsOf(trace, 'timer:init')
    // The event itself sits on the delay argument, 10 characters after the arrow starts.
    expect(init!.callback!.loc).toMatchObject({ line: 2, column: 14 })
    expect(init!.loc).toMatchObject({ line: 2, column: 24 })
  })

  it('unwraps a bound function to its target', async () => {
    const trace = await traceOf(`function f() {}\nsetTimeout(f.bind(null), 0)`)
    expect(textOf(trace, eventsOf(trace, 'timer:init')[0]!.callback)).toBe('function f() {}')
  })

  it('gives every setInterval repeat its own task id', async () => {
    const trace = await traceOf(`let n = 0; const id = setInterval(() => { if (++n === 3) clearInterval(id) }, 5)`)
    const inits = eventsOf(trace, 'timer:init')
    expect(inits.length).toBeGreaterThanOrEqual(3)
    expect(new Set(inits.map((e) => e.taskId)).size).toBe(inits.length)
    for (const init of inits) expect(textOf(trace, init.callback)).toContain('clearInterval(id)')
  })

  it('names a built-in callback', async () => {
    const trace = await traceOf(`setTimeout(console.log, 0)`)
    expect(eventsOf(trace, 'timer:init')[0]!.callback).toEqual({ kind: 'builtin', name: 'log' })
  })

  it('does not locate eval code on identical text inside the Script', async () => {
    const trace = await traceOf(`setTimeout(eval("(function f(){ return 1 })"), 0)`)
    expect(eventsOf(trace, 'timer:init')[0]!.callback).toEqual({ kind: 'builtin', name: 'f' })
  })

  it('does not locate new Function code on identical text inside the Script', async () => {
    const trace = await traceOf(`const note = 'anonymous'\nsetTimeout(new Function('return 1'), 0)`)
    expect(eventsOf(trace, 'timer:init')[0]!.callback?.kind).toBe('builtin')
  })

  it('falls back to the name for a function created by eval', async () => {
    const trace = await traceOf(`setTimeout(eval('(function ev' + 'ald() { return 1 })'), 0)`)
    expect(eventsOf(trace, 'timer:init')[0]!.callback).toEqual({ kind: 'builtin', name: 'evald' })
  })
})

describe('Job callbacks', () => {
  it('describes a queueMicrotask callback', async () => {
    const trace = await traceOf(`queueMicrotask(() => console.log(2))`)
    expect(textOf(trace, jobCallbacks(trace)[0])).toBe('() => console.log(2)')
  })

  it('describes .then and .catch handlers', async () => {
    const trace = await traceOf(
      `Promise.resolve(1).then((v) => v + 1)\nPromise.reject(2).catch((e) => e)`,
    )
    const texts = jobCallbacks(trace).map((c) => textOf(trace, c))
    expect(texts).toEqual(['(v) => v + 1', '(e) => e'])
  })

  it('shows the onFinally text for .finally', async () => {
    const trace = await traceOf(`Promise.resolve(1).finally(() => console.log('done'))`)
    expect(textOf(trace, jobCallbacks(trace)[0])).toBe(`() => console.log('done')`)
  })

  it('has no callback when .then has no handler for the outcome', async () => {
    const trace = await traceOf(`Promise.resolve(1).then()`)
    expect(jobCallbacks(trace)).toEqual([undefined])
  })

  it('names a built-in handler', async () => {
    const trace = await traceOf(`Promise.resolve(1).then(console.log)`)
    expect(jobCallbacks(trace)[0]).toEqual({ kind: 'builtin', name: 'log' })
  })

  it('describes an await continuation by function name and the line it paused at', async () => {
    const trace = await traceOf(`async function load() {\n  await null\n  await Promise.resolve()\n}\nload()`)
    const awaits = jobCallbacks(trace).filter((c) => c?.kind === 'await')
    expect(awaits.length).toBe(2)
    expect(awaits.map((c) => c!.name)).toEqual(['load', 'load'])
    expect(awaits.map((c) => c!.loc!.line)).toEqual([2, 3])
  })

  it('points an await at its own line, not at the lines of a multi-line operand', async () => {
    const trace = await traceOf(
      `function g() {\n  let a = 1\n  let b = 2\n  return Promise.resolve(a + b)\n}\nasync function f() {\n  await g()\n}\nf()`,
    )
    const cont = jobCallbacks(trace).find((c) => c?.kind === 'await')
    expect(cont?.loc?.line).toBe(7)
    expect(textOf(trace, cont)).toBe('await g()')
  })

  it('points a pending await at its expression when the executor spans lines', async () => {
    const trace = await traceOf(
      `async function f() {\n  await new Promise((r) => {\n    const t = 1\n    setTimeout(r, t)\n  })\n}\nf()`,
    )
    expect(jobCallbacks(trace).find((c) => c?.kind === 'await')?.loc?.line).toBe(2)
  })

  it('tells nested awaits apart', async () => {
    const trace = await traceOf(
      `function h(v) {\n  return v\n}\nasync function f() {\n  const x = h(\n    await Promise.resolve(1),\n  )\n  await h(\n    await null,\n  )\n}\nf()`,
    )
    const lines = jobCallbacks(trace).filter((c) => c?.kind === 'await').map((c) => c!.loc!.line)
    expect(lines).toEqual([6, 9, 8])
  })

  it('describes the pause of an await on a promise that is still pending', async () => {
    const trace = await traceOf(`async function f() {\n  await new Promise((r) => setTimeout(r, 1))\n}\nf()`)
    const cont = jobCallbacks(trace).find((c) => c?.kind === 'await')
    expect(cont?.name).toBe('f')
    expect(cont?.loc?.line).toBe(2)
  })

  it('describes the `then` method of a user thenable', async () => {
    const trace = await traceOf(`Promise.resolve({ then(res) { res(1) } })`)
    const thenable = eventsOf(trace, 'job:enqueue').find((e) => e.jobKind === 'thenable')!
    expect(textOf(trace, thenable.callback)).toBe('then(res) { res(1) }')
  })

  it('names the built-in `then` of a native thenable', async () => {
    const trace = await traceOf(`new Promise((r) => r(Promise.resolve(1)))`)
    const thenable = eventsOf(trace, 'job:enqueue').find((e) => e.jobKind === 'thenable')!
    expect(thenable.callback).toEqual({ kind: 'builtin', name: 'then' })
  })
})

describe('port message callbacks', () => {
  it('describes the handler a delivery will call', async () => {
    const trace = await traceOf(
      `const ch = new MessageChannel()\nch.port1.onmessage = (e) => console.log(e.data)\nch.port2.postMessage(1)`,
    )
    const queued = eventsOf(trace, 'task:queue').find((e) => e.source === 'port-message')!
    expect(textOf(trace, queued.callback)).toBe('(e) => console.log(e.data)')
  })

  it('has no callback when start() ran before onmessage was set', async () => {
    const trace = await traceOf(
      `const ch = new MessageChannel()\nch.port1.start()\nch.port2.postMessage(1)\nch.port1.onmessage = () => {}`,
    )
    const queued = eventsOf(trace, 'task:queue').find((e) => e.source === 'port-message')!
    expect(queued.callback).toBeUndefined()
  })
})
