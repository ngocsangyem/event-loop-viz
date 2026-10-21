// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../example-library'
import { runScript } from '../../runner/run-script'
import type { Trace, TraceEvent } from '../../trace/trace-event'
import { createPlayer } from '../../player/player'

type Ev<K extends TraceEvent['k']> = TraceEvent & { k: K }
const ofKind = <K extends TraceEvent['k']>(trace: Trace, k: K) =>
  trace.events.filter((e): e is Ev<K> => e.k === k)
const timerQueues = (trace: Trace) => ofKind(trace, 'task:queue').filter((e) => e.source === 'timer')

async function ranTrace(script: string): Promise<Trace> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.trace
}

describe('replay of a timer Task queued when due', () => {
  it('drops a queued timer Task when it is cleared during a busy-wait', async () => {
    const trace = await ranTrace(`
      const id = setTimeout(() => console.log('no'), 0);
      const start = Date.now();
      while (Date.now() - start < 20) {}
      clearTimeout(id);
    `)
    const [queue] = timerQueues(trace)
    expect(queue).toBeDefined()
    expect(ofKind(trace, 'task:begin').some((e) => e.taskId === queue!.taskId)).toBe(false)
    const clear = ofKind(trace, 'timer:clear')[0]!
    const player = createPlayer(trace)
    expect(player.stateAt(clear.seq - 1).tasks.some((t) => t.taskId === queue!.taskId)).toBe(true)
    expect(player.stateAt(clear.seq).tasks.some((t) => t.taskId === queue!.taskId)).toBe(false)
  })

  it('never shows one timer in both Web APIs and the Task Queue, in any example', async () => {
    for (const example of EXAMPLES) {
      const result = await runScript(example.script)
      if (result.kind !== 'ran') continue
      const player = createPlayer(result.trace)
      for (let seq = 0; seq < result.trace.events.length; seq++) {
        const s = player.stateAt(seq)
        const waiting = new Set(s.timers.map((t) => t.tid))
        const both = s.tasks.filter((t) => t.tid !== undefined && waiting.has(t.tid))
        expect(both, `${example.id} @${seq}`).toEqual([])
      }
    }
  })
})
