import { inject, shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'
import { CHIP_TRAVEL_KEY } from './chip-travel-keys'

/**
 * The items a lane lost in its latest change, so the lane can draw a dashed ghost where each one
 * was. The ghosts last one step: the next change replaces them. A jump (scrub, Tick skip) leaves
 * none, since nothing visibly "left" then.
 */
export function useDepartedItems<T extends { id: string }>(items: () => readonly T[]): ShallowRef<readonly T[]> {
  const travel = inject(CHIP_TRAVEL_KEY, null)
  const departed = shallowRef<readonly T[]>([])
  let before = items()
  watch(items, (after) => {
    const kept = new Set(after.map((item) => item.id))
    departed.value = travel?.snapping.value ? [] : before.filter((item) => !kept.has(item.id))
    before = after
  })
  return departed
}
