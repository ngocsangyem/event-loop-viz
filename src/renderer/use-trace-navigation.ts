import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Player } from '../player/player'

export type JumpUnit = 'Tick' | 'Task'
export type Direction = 'next' | 'prev'

/**
 * Manual moves of the playhead: single steps, Tick/Task jumps and the two ends. Every move
 * clamps at the Trace ends; with no Trace they do nothing.
 */
export function useTraceNavigation(player: () => Player | null, position: Ref<number>) {
  const atStart = computed(() => {
    const p = player()
    return !p || position.value <= p.first()
  })
  const atEnd = computed(() => {
    const p = player()
    return !p || position.value >= p.last()
  })

  function step(direction: Direction) {
    const p = player()
    if (p) position.value = p[direction](position.value)
  }

  function jump(edge: 'first' | 'last') {
    const p = player()
    if (p) position.value = p[edge]()
  }

  function jumpBy(unit: JumpUnit, direction: Direction) {
    const p = player()
    if (p) position.value = p[`${direction}${unit}`](position.value)
  }

  return { atStart, atEnd, step, jump, jumpBy }
}
