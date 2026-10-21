import { computed, provide } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Player } from '@/player/player'
import { CHIP_TRAVEL_KEY, createChipTravelState } from '@/renderer/panels/chip-travel-keys'
import { travelDurationMs } from '@/renderer/panels/chip-travel-plan'
import { panelSignature } from '@/renderer/panels/panel-view-model'
import { stepIntervalMs } from '@/renderer/use-playback'
import type { SameView } from '@/renderer/use-playback'
import type { VisualizerView } from '@/renderer/use-visualizer-view'

interface PlaybackControls {
  playing: boolean
  speed: number
}

/** Whether two positions draw the same panels. */
export function createSameView(player: Pick<Player, 'stateAt'>): SameView {
  // Playback asks about one `from` against many following positions; its signature is the same each time.
  let fromAt = -1
  let fromSignature = ''
  return (from, to) => {
    if (from !== fromAt) {
      fromSignature = panelSignature(player.stateAt(from))
      fromAt = from
    }
    return fromSignature === panelSignature(player.stateAt(to))
  }
}

/**
 * What the panels view needs to move chips between panels: the "looks the same" test that
 * playback and the travel layer share, the flight length, and the state the panel lists read
 * to know when a patch is a jump or a flight's landing row.
 */
export function usePanelChipTravel(
  view: Ref<VisualizerView>,
  player: Ref<Player | null>,
  transport: () => PlaybackControls | null | undefined,
): { sameView: ComputedRef<SameView | undefined>; travelMs: ComputedRef<number> } {
  provide(CHIP_TRAVEL_KEY, createChipTravelState())

  /** In the panels view, playback passes over steps the panels draw identically. */
  const sameView = computed((): SameView | undefined => {
    const current = player.value
    if (view.value !== 'panels' || !current) return undefined
    return createSameView(current)
  })

  /** Flights fit the playback step while playing; a manual step gets the calm default. */
  const travelMs = computed(() => {
    const controls = transport()
    return travelDurationMs(controls?.playing ?? false, stepIntervalMs(controls?.speed ?? 1))
  })

  return { sameView, travelMs }
}
