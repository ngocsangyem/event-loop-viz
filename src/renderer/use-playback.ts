import { onScopeDispose, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Player } from '../player/player'

/** Visible Events advanced per second at 1x; tunable. */
export const EVENTS_PER_SECOND_AT_1X = 2
export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]

/** Milliseconds between steps at a speed multiplier. */
export function stepIntervalMs(speed: number): number {
  return 1000 / (EVENTS_PER_SECOND_AT_1X * speed)
}

/**
 * Timer-driven playback. It only moves the playhead by calling the player's `next`,
 * and stops by itself on the last step or when the Trace is replaced.
 */
export function usePlayback(player: Ref<Player | null>, position: Ref<number>) {
  const playing = ref(false)
  const speed = ref<Speed>(1)
  let timer: ReturnType<typeof setInterval> | null = null

  function clear() {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  function pause() {
    playing.value = false
  }

  function play() {
    const p = player.value
    if (!p) return
    // Playing from the end restarts, like a media player.
    if (position.value >= p.last()) position.value = p.first()
    playing.value = true
  }

  function toggle() {
    if (playing.value) pause()
    else play()
  }

  watch(
    [playing, speed, player],
    () => {
      clear()
      const p = player.value
      if (!playing.value || !p) {
        playing.value = false
        return
      }
      timer = setInterval(() => {
        position.value = p.next(position.value)
        if (position.value >= p.last()) pause()
      }, stepIntervalMs(speed.value))
    },
    { flush: 'sync' },
  )
  onScopeDispose(clear)

  return { playing, speed, play, pause, toggle }
}
