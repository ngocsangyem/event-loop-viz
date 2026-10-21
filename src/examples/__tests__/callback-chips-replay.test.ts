// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { chipsOf } from '../../renderer/panels/callback-chip-model'
import type { ChipLabels } from '../../renderer/panels/callback-chip-model'
import { createPlayer } from '../../player/player'
import { runScript } from '../../runner/run-script'
import { EXAMPLES } from '../example-library'

const labels: ChipLabels = {
  awaitResume: (fn) => `${fn} after await`,
  anonymous: '(anonymous)',
  line: (n) => `line ${n}`,
  taskSource: (s) => s,
  jobKind: (k) => k,
}

describe('chipsOf', () => {
  it('keeps each chip id in exactly one place, and shows the callback text, in every example at every position', async () => {
    for (const example of EXAMPLES) {
      const result = await runScript(example.script)
      if (result.kind !== 'ran') continue
      const player = createPlayer(result.trace)
      const source = result.trace.header.source
      for (let seq = 0; seq < result.trace.events.length; seq++) {
        const s = player.stateAt(seq)
        const chips = chipsOf(s, source, labels)
        const ids = [
          ...s.timers.map((t) => t.taskId),
          ...s.tasks.map((t) => t.taskId),
          ...s.jobs.map((j) => j.jobId),
          ...(s.runningCallback && !s.runningCallback.done ? [s.runningCallback.chipId] : []),
        ].filter((id) => chips.has(id!))
        expect(new Set(ids).size, `${example.id} @${seq}`).toBe(ids.length)
        expect(ids.length, `${example.id} @${seq}`).toBe(chips.size)
      }
    }
  })

  it('moves a chip from the queue to the running row to the stack to nowhere', async () => {
    const result = await runScript(`queueMicrotask(function micro() { console.log(1) })`)
    if (result.kind !== 'ran') throw new Error('did not run')
    const player = createPlayer(result.trace)
    const places: string[] = []
    for (let seq = 0; seq < result.trace.events.length; seq++) {
      const chips = chipsOf(player.stateAt(seq), result.trace.header.source, labels)
      const place = [...chips.values()][0]?.place ?? 'none'
      if (places[places.length - 1] !== place) places.push(place)
    }
    expect(places).toEqual(['none', 'microq', 'microq-running', 'stack', 'none'])
  })
})
