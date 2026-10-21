// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Trace, TraceEvent } from '../../trace/trace-event'
import { runScript } from '../run-script'
import type { RunResult } from '../run-script'

async function ran(script: string): Promise<Extract<RunResult, { kind: 'ran' }>> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

type Ev<K extends TraceEvent['k']> = TraceEvent & { k: K }
const ofKind = <K extends TraceEvent['k']>(trace: Trace, k: K) =>
  trace.events.filter((e): e is Ev<K> => e.k === k)
const timerQueues = (trace: Trace) => ofKind(trace, 'task:queue').filter((e) => e.source === 'timer')
const logs = (r: Extract<RunResult, { kind: 'ran' }>) =>
  r.observableOutput.map((o) => (o.kind === 'console' ? o.text : o.kind))

describe('a timer Task is queued when the Virtual Clock reaches its due time', () => {
  it('does not queue at timer:init; queues after the Script ends for a 10 ms timer', async () => {
    const { trace } = await ran(`setTimeout(() => console.log(2), 10)`)
    const [queue] = timerQueues(trace)
    const init = ofKind(trace, 'timer:init')[0]!
    const scriptEnd = ofKind(trace, 'task:end')[0]!
    expect(queue).toBeDefined()
    expect(queue!.seq).toBeGreaterThan(scriptEnd.seq)
    expect(queue!.t).toBeGreaterThanOrEqual(queue!.dueUs!)
    expect(queue!.dueUs).toBe(init.t + 10_000)
    expect(queue!.tid).toBe(init.tid)
    // No source location (the clock tick is unrelated code); cause is the setTimeout call.
    expect(queue!.loc).toBeUndefined()
    expect(queue!.cause).toBe(init.seq)
  })

  it('queues the timer Task while a busy-wait Task is still running', async () => {
    const result = await ran(`
      setTimeout(() => console.log('timeout 0'), 0);
      const start = Date.now();
      while (Date.now() - start < 20) {}
      console.log('after busy wait');
    `)
    const { trace } = result
    const [queue] = timerQueues(trace)
    const scriptEnd = ofKind(trace, 'task:end')[0]!
    const after = ofKind(trace, 'console').find((e) => e.text === 'after busy wait')!
    expect(queue!.seq).toBeLessThan(scriptEnd.seq)
    expect(queue!.t).toBeLessThan(after.t)
    expect(logs(result)).toEqual(['after busy wait', 'timeout 0'])
  })

  it('queues equal-delay timers in arm order, each at its own due time', async () => {
    const { trace } = await ran(`
      setTimeout(() => {}, 10);
      setTimeout(() => {}, 10);
    `)
    const queues = timerQueues(trace)
    const inits = ofKind(trace, 'timer:init')
    expect(queues.map((q) => q.tid)).toEqual(inits.map((i) => i.tid))
    // The second timer was armed a few ticks later, so it is due (and queued) a little after the first.
    for (const q of queues) expect(q.t).toBeGreaterThanOrEqual(q.dueUs!)
    expect(queues[0]!.dueUs).toBeLessThan(queues[1]!.dueUs!)
  })

  it('emits no task:queue for a timer cleared before it is due', async () => {
    const result = await ran(`const id = setTimeout(() => console.log('no'), 10); clearTimeout(id)`)
    expect(timerQueues(result.trace)).toEqual([])
    expect(logs(result)).toEqual([])
  })

  it('queues each setInterval repeat only when due', async () => {
    const result = await ran(`
      let n = 0;
      const id = setInterval(() => { console.log(++n); if (n === 3) clearInterval(id) }, 10);
    `)
    const queues = timerQueues(result.trace)
    expect(queues).toHaveLength(3)
    for (const q of queues) expect(q.t).toBeGreaterThanOrEqual(q.dueUs!)
    // Each repeat is armed at its fire, so it is queued after the previous Task began.
    const begins = ofKind(result.trace, 'task:begin')
    expect(queues[1]!.seq).toBeGreaterThan(begins.find((b) => b.taskId === queues[0]!.taskId)!.seq)
    expect(logs(result)).toEqual(['1', '2', '3'])
  })

  it('keeps the Observable Output of mixed timers and microtasks', async () => {
    const result = await ran(`
      setTimeout(() => console.log('t10'), 10);
      setTimeout(() => console.log('t0'), 0);
      Promise.resolve().then(() => console.log('micro'));
      console.log('sync');
    `)
    expect(logs(result)).toEqual(['sync', 'micro', 't0', 't10'])
  })
})
