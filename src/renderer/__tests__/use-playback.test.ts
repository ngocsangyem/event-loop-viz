// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { createPlayer } from '../../player/player'
import { usePlayback, stepIntervalMs } from '../use-playback'
import { buildTrace } from '../../player/__tests__/hand-built-traces'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup() {
  const trace = buildTrace(
    Array.from({ length: 10 }, (_, i) => ({ k: 'console', level: 'log', text: String(i) }) as never),
  )
  const player = ref(createPlayer(trace))
  const position = ref(player.value.first())
  const scope = effectScope()
  const pb = scope.run(() => usePlayback(player, position))!
  return { pb, position, player, scope }
}

describe('playback', () => {
  it('advances while playing, freezes on pause, stops at the end', () => {
    const { pb, position, player } = setup()
    pb.play()
    vi.advanceTimersByTime(stepIntervalMs(1) * 2)
    expect(position.value).toBe(player.value.stepPositions()[2])
    pb.pause()
    const frozen = position.value
    vi.advanceTimersByTime(10_000)
    expect(position.value).toBe(frozen)
    pb.play()
    vi.advanceTimersByTime(60_000)
    expect(position.value).toBe(player.value.last())
    expect(pb.playing.value).toBe(false)
  })

  it('covers the same span in a quarter of the time at 4x', () => {
    const a = setup()
    a.pb.play()
    vi.advanceTimersByTime(4000)
    const slow = a.position.value
    const b = setup()
    b.pb.speed.value = 4
    b.pb.play()
    vi.advanceTimersByTime(1000)
    expect(b.position.value).toBe(slow)
  })

  it('restarts from the first step when played at the end', () => {
    const { pb, position, player } = setup()
    position.value = player.value.last()
    pb.play()
    expect(position.value).toBe(player.value.first())
  })
})
