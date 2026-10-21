import { nextTick, onScopeDispose, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Player } from '../../player/player'
import type { SameView } from '../use-playback'
import { usePrefersReducedMotion } from '../scene/scene-motion'
import { chipLabelsOf, chipsOf } from './callback-chip-model'
import { chipElements } from './chip-elements'
import { flyChip, isOnScreen, pulseChip, rectOf } from './chip-flight'
import type { ChipRect, Flight } from './chip-flight'
import { isSingleStep } from './chip-step-detection'
import type { ChipTravelState } from './chip-travel-keys'
import { diffChipPlaces } from './chip-travel-plan'

export interface ChipTravelOptions {
  player: () => Player | null
  position: () => number
  source: () => string
  sameView: () => SameView | undefined
  /** Length of one flight, from the playback speed. */
  travelMs: () => number
  overlay: () => HTMLElement | null
  state: ChipTravelState
}

const NO_IDS: ReadonlySet<string> = new Set()

/**
 * Makes callback chips visibly travel between panels on a single step, forward or back.
 * Positions are taken from the state (which chips change place) and rectangles from the DOM
 * (before and after Vue patches), so the real chips stay in their panels the whole time.
 * Anything that is not a single step, any reduced-motion setting and any chip that cannot be
 * followed on screen just appears, with a short pulse where motion is allowed.
 */
export function useChipTravel(options: ChipTravelOptions) {
  const { t } = useI18n()
  const reduced = usePrefersReducedMotion()
  const { arriving, snapping } = options.state
  let running: Flight[] = []
  let generation = 0

  /** Ends flights at once: ghosts go, hidden chips show, so the next step measures the real layout. */
  function finish() {
    for (const flight of running) flight.end()
    running = []
    arriving.value = NO_IDS
  }

  /** A move that fails must not leave the lists without transitions or the chips hidden. */
  async function onMove(to: number, from: number, player: Player | null, previous: Player | null) {
    const mine = ++generation
    try {
      await travel(mine, to, from, player, previous)
    } catch (error) {
      console.error('Chip travel failed; showing the new state without motion', error)
      if (mine === generation) finish()
    } finally {
      if (mine === generation) snapping.value = false
    }
  }

  async function travel(mine: number, to: number, from: number, player: Player | null, previous: Player | null) {
    finish()
    const canAnimate = typeof Element.prototype.animate === 'function' && !reduced.value
    // A new Trace has nothing to compare with: it just appears.
    if (!player || player !== previous) {
      snapping.value = true
      await nextTick()
      if (mine === generation) snapping.value = false
      return
    }
    const single = isSingleStep(player, from, to, options.sameView())
    snapping.value = !single

    const labels = chipLabelsOf(t)
    const source = options.source()
    const plan = diffChipPlaces(
      chipsOf(player.stateAt(from), source, labels),
      chipsOf(player.stateAt(to), source, labels),
    )
    const flies = single && canAnimate && !plan.tooMany
    // Entered chips leave the highlighted code; going back there is nothing to leave from.
    const flyingEntered = to > from ? plan.entered : []
    const flying = flies ? [...plan.moved, ...flyingEntered] : []
    arriving.value = flying.length > 0 ? new Set(flying) : NO_IDS

    // Old DOM, before Vue patches it.
    const before = new Map<string, ChipRect>()
    if (flies) {
      for (const [id, el] of chipElements()) if (plan.moved.includes(id)) before.set(id, rectOf(el))
    }

    await nextTick()
    snapping.value = false
    if (mine !== generation) return

    const chips = chipElements()
    const overlay = options.overlay()
    const highlight = document.querySelector('.cm-source-highlight')
    const duration = options.travelMs()
    for (const id of [...plan.moved, ...plan.entered]) {
      const chip = chips.get(id)
      if (!chip) continue
      const last = rectOf(chip)
      const origin = before.get(id) ?? (flyingEntered.includes(id) && highlight ? editorOrigin(highlight, last) : null)
      if (flies && overlay && origin && isOnScreen(origin) && isOnScreen(last)) {
        running.push(flyChip(overlay, chip, origin, last, duration))
      } else if (canAnimate) {
        running.push(pulseChip(chip))
      }
    }
    // The rows only needed to skip their enter transform while they were measured and set off.
    if (running.length === 0) arriving.value = NO_IDS
    else {
      const settled = running
      void Promise.allSettled(settled.map((flight) => flight.settled)).then(() => {
        if (mine === generation) arriving.value = NO_IDS
      })
    }
  }

  watch(
    [options.position, options.player],
    ([to, player], [from, previous]) => void onMove(to, from, player, previous),
    { flush: 'pre' },
  )
  onScopeDispose(() => {
    generation++
    finish()
    snapping.value = false
  })
}

/** Chips scheduled by the code start at the left edge of the highlighted text, centred on its line. */
function editorOrigin(highlight: Element, target: ChipRect): ChipRect {
  const rect = rectOf(highlight)
  return { left: rect.left, top: rect.top + rect.height / 2 - target.height / 2, width: target.width, height: target.height }
}
