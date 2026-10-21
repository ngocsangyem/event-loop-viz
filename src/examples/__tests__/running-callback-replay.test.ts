// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../../runner/run-script'
import { createPlayer } from '../../player/player'
import type { Trace } from '../../trace/trace-event'

async function ranTrace(script: string): Promise<Trace> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.trace
}

/** For each event, the frame label the running callback sits on (null while not on the stack). */
function framesOfCallback(trace: Trace) {
  const player = createPlayer(trace)
  const seen: { chipId: string; label: string | null; done: boolean }[] = []
  for (let seq = 0; seq < trace.events.length; seq++) {
    const s = player.stateAt(seq)
    const rc = s.runningCallback
    if (!rc) continue
    seen.push({ chipId: rc.chipId, label: s.stack.find((f) => f.frameId === rc.frameId)?.label ?? null, done: rc.done })
  }
  return seen
}

describe('running callback on real traces', () => {
  it('follows a timer callback, a then callback and a queueMicrotask callback to their frames', async () => {
    const trace = await ranTrace(`
      setTimeout(function timerCb() { console.log(2) }, 0);
      Promise.resolve().then(function thenCb() { console.log(1) });
      queueMicrotask(function microCb() { console.log(3) });
    `)
    const seen = framesOfCallback(trace)
    for (const name of ['timerCb', 'thenCb', 'microCb']) {
      expect(seen.some((s) => s.label === name && !s.done)).toBe(true)
    }
    expect(seen.some((s) => s.done)).toBe(true)
  })

  it('has no chip for the Script Task', async () => {
    const trace = await ranTrace(`console.log(1)`)
    expect(framesOfCallback(trace)).toEqual([])
  })

  it('follows an await continuation on the async function frame', async () => {
    const trace = await ranTrace(`async function f() { await null; console.log(1) } f()`)
    expect(framesOfCallback(trace).some((s) => s.label === 'f' && !s.done)).toBe(true)
  })

  it('follows a built-in callback on its own frame', async () => {
    const trace = await ranTrace(`setTimeout(console.log, 0, 'x')`)
    expect(framesOfCallback(trace).some((s) => s.label === 'log' && !s.done)).toBe(true)
  })
})
