// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findExample } from '../../../examples/example-library'
import { runScript } from '../../../runner/run-script'
import { narrateTrace } from '../narrate-trace'

async function narrate(script: string) {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error('the Script did not run')
  return narrateTrace(result.trace)
}

const variants = (steps: Awaited<ReturnType<typeof narrate>>) => steps.map((s) => s.variant)

describe('narrateTrace', () => {
  it('walks a console.log through the call stack before the next line', async () => {
    const steps = await narrate(findExample('sync-promise-async-timeout')!.script)
    expect(variants(steps).slice(0, 6)).toEqual(['scriptStart', 'builtinCall', 'console', 'builtinCall', 'timer', 'taskQueued.timer'])
    expect(steps[1]!.params).toMatchObject({ name: 'console.log()', line: 2 })
    expect(steps[2]!.params).toMatchObject({ text: 'start' })
    expect(steps[3]!.params).toMatchObject({ name: 'setTimeout()', line: 3 })
  })

  it('names the Script line each step is about, so the code can be lit with the spot', async () => {
    const steps = await narrate(findExample('sync-promise-async-timeout')!.script)
    expect(steps.slice(1, 6).map((s) => s.code)).toEqual([2, 2, 3, 3, 3])
    expect(steps.find((s) => s.variant === 'callbackStart.job')?.code).toBe(4)
    expect(steps[0]!.code).toBeUndefined()
  })

  it('walks a Script that is no example, with no key and no AI', async () => {
    const steps = await narrate("setTimeout(() => console.log('timer'), 10)\nconsole.log('sync')")
    expect(steps.filter((s) => s.kind === 'console').map((s) => s.params.text)).toEqual(['sync', 'timer'])
    expect(steps.at(-1)?.variant).toBe('halt.natural')
  })

  it('follows each Job from the queue onto the call stack, and the timer Task after the Checkpoint', async () => {
    const steps = await narrate(findExample('sync-promise-async-timeout')!.script)
    const v = variants(steps)
    expect(v).toContain('jobQueued.await')
    expect(v.indexOf('checkpoint')).toBeLessThan(v.indexOf('callbackStart.job'))
    expect(v.indexOf('resume')).toBeLessThan(v.indexOf('taskStart.timer'))
    expect(v.indexOf('taskStart.timer')).toBeLessThan(v.indexOf('callbackStart.task'))
    expect(v.at(-1)).toBe('halt.natural')
  })

  it('leaves engine helpers out: no Promise constructor or executor steps', async () => {
    const steps = await narrate(findExample('sync-promise-async-timeout')!.script)
    const names = steps.filter((s) => s.kind === 'builtinCall').map((s) => s.params.name)
    expect(names).toEqual(['console.log()', 'setTimeout()', 'Promise.resolve()', '.then()', 'console.log()', 'console.log()', 'console.log()', 'console.log()', 'console.log()'])
  })

  it('folds a busy loop into one step with its count, but keeps a short then chain apart', async () => {
    const busy = await narrate(findExample('busy-wait')!.script)
    const loop = busy.find((s) => s.variant === 'builtinCall.repeated')
    expect(loop?.params).toMatchObject({ name: 'Date.now()', line: 4 })
    expect(Number(loop?.params.count)).toBeGreaterThan(100)
    const chain = await narrate(findExample('thenables')!.script)
    expect(chain.filter((s) => s.params.name === '.then()')).toHaveLength(3)
  })

  it('says how a halted Run ends', async () => {
    const steps = await narrate(findExample('infinite-loop')!.script)
    expect(steps.at(-1)).toMatchObject({ variant: 'halt.budget', target: 'source' })
  })
})
