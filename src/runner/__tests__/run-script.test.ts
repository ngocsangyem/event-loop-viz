// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { RunResult } from '../run-script'
import type { Trace, TraceEvent } from '../../trace/trace-event'

async function ran(script: string): Promise<Extract<RunResult, { kind: 'ran' }>> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

const kinds = (trace: Trace) => trace.events.map((e) => e.k)
const first = (trace: Trace, k: TraceEvent['k']) => trace.events.find((e) => e.k === k)

describe('runScript: console and timers', () => {
  it('orders timers by due time on the Virtual Clock, then by registration', async () => {
    const { observableOutput } = await ran(`
      setTimeout(() => console.log('A10'), 10);
      setTimeout(() => console.log('B10'), 10);
      setTimeout(() => console.log('C5'), 5);
    `)
    expect(observableOutput.map((o) => (o.kind === 'console' ? o.text : o.kind))).toEqual([
      'C5',
      'A10',
      'B10',
    ])
  })

  it('does not run a cleared timer', async () => {
    const { trace, observableOutput } = await ran(`
      const id = setTimeout(() => console.log('never'), 5);
      clearTimeout(id);
      console.log('done');
    `)
    expect(observableOutput).toEqual([{ kind: 'console', level: 'log', text: 'done' }])
    expect(kinds(trace)).toContain('timer:clear')
    expect(kinds(trace)).not.toContain('timer:fire')
  })

  it('reports an uncaught exception from a timer callback and keeps running the loop', async () => {
    const { observableOutput } = await ran(`
      setTimeout(() => { throw new Error('boom') }, 0);
      setTimeout(() => console.log('after'), 1);
    `)
    expect(observableOutput).toEqual([
      { kind: 'uncaught-exception', message: 'boom' },
      { kind: 'console', level: 'log', text: 'after' },
    ])
  })
})

describe('runScript: Trace shape', () => {
  it('has a v1 header, dense seq numbers, run:start first and a natural run:halted last', async () => {
    const script = `setTimeout(() => console.log('x'), 3)`
    const { trace } = await ran(script)
    expect(trace.header).toMatchObject({
      schemaVersion: 1,
      hostProfile: 'chrome-155',
      source: script,
      nodeCostUs: 1,
      unsupportedApis: [],
      timingSensitive: false,
    })
    expect(trace.header.engine.name).toBe('engine262')
    expect(trace.events.map((e) => e.seq)).toEqual(trace.events.map((_, i) => i))
    expect(trace.events[0]?.k).toBe('run:start')
    expect(trace.events[trace.events.length - 1]).toMatchObject({ k: 'run:halted', reason: 'natural' })
  })

  it('wraps each Task in task:begin/task:end followed by a Checkpoint', async () => {
    const { trace } = await ran(`setTimeout(() => {}, 0)`)
    const flow = kinds(trace).filter((k) => /^(task|checkpoint|timer):/.test(k))
    expect(flow).toEqual([
      'task:queue', // script Task
      'task:begin',
      'timer:init',
      'task:queue', // timer Task
      'task:end',
      'checkpoint:begin',
      'checkpoint:end',
      'task:begin',
      'timer:fire',
      'task:end',
      'checkpoint:begin',
      'checkpoint:end',
    ])
  })

  it('records timer clamping and due time on the Virtual Clock', async () => {
    const { trace } = await ran(`setTimeout(() => {}, 7)`)
    expect(first(trace, 'timer:init')).toMatchObject({
      requestedMs: 7,
      clampedMs: 7,
      nesting: 1,
      repeat: false,
    })
    const queued = trace.events.filter((e) => e.k === 'task:queue').pop()
    expect(queued).toMatchObject({ k: 'task:queue', source: 'timer' })
    if (queued?.k !== 'task:queue') throw new Error('unreachable')
    expect((queued.dueUs ?? 0) - queued.t).toBe(7000)
  })

  it('keeps built-in frame labels under their real names', async () => {
    const { trace } = await ran(`setTimeout(() => console.log('x'), 0)`)
    const builtins = trace.events.flatMap((e) => (e.k === 'frame:push' && e.builtin ? [e.label] : []))
    expect(builtins).toContain('setTimeout')
    expect(builtins).toContain('log')
    expect(trace.events.some((e) => e.k === 'frame:push' && !e.builtin)).toBe(true)
  })

  it('pairs every frame:push with a frame:pop', async () => {
    const { trace } = await ran(`function f() { console.log(1) } f(); setTimeout(f, 0)`)
    const open = new Set<string>()
    const unmatchedPops: string[] = []
    for (const e of trace.events) {
      if (e.k === 'frame:push') open.add(e.frameId)
      if (e.k === 'frame:pop' && !open.delete(e.frameId)) unmatchedPops.push(e.frameId)
    }
    expect(unmatchedPops).toEqual([])
    expect(open.size).toBe(0)
  })
})

describe('runScript: determinism and engine configuration', () => {
  it('produces deep-equal Traces for two Runs of the same Script', async () => {
    const script = `
      setTimeout(() => console.log('a'), 2);
      setTimeout(() => { console.log('b'); setTimeout(() => console.log('c'), 0) }, 1);
    `
    const one = await ran(script)
    const two = await ran(script)
    expect(one.trace).toEqual(two.trace)
  })

  it('runs engine262 with manual Job execution: Jobs only run at the Checkpoint', async () => {
    const { trace } = await ran(`
      Promise.resolve().then(() => console.log('micro'));
      console.log('sync');
    `)
    const checkpointBegin = first(trace, 'checkpoint:begin')!.seq
    const consoles = trace.events.filter((e) => e.k === 'console')
    expect(consoles.map((e) => (e.k === 'console' ? e.text : ''))).toEqual(['sync', 'micro'])
    expect(consoles[0]!.seq).toBeLessThan(checkpointBegin)
    expect(consoles[1]!.seq).toBeGreaterThan(checkpointBegin)
  })
})

describe('runScript: syntax errors', () => {
  it('returns syntax-error with line and column and no Trace', async () => {
    const result = await runScript(`console.log(1);\n  let = = 2`)
    expect(result).toEqual({ kind: 'syntax-error', message: 'Unexpected token', line: 2, column: 9 })
  })
})
