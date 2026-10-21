import { shallowRef } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'

/**
 * What the travel layer tells the lists before they patch. The lists live in other subtrees than
 * the layer, so the app provides one instance to both.
 */
export interface ChipTravelState {
  /** Chip ids about to arrive by flight; their rows skip their own enter transform so the target rect is final. */
  arriving: ShallowRef<ReadonlySet<string>>
  /** The coming patch is a jump: rows appear and vanish without transitions. */
  snapping: ShallowRef<boolean>
}

export const CHIP_TRAVEL_KEY: InjectionKey<ChipTravelState> = Symbol('chip-travel')

export function createChipTravelState(): ChipTravelState {
  return { arriving: shallowRef<ReadonlySet<string>>(new Set()), snapping: shallowRef(false) }
}
