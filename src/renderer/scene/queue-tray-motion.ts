import { computed } from 'vue'
import type { Plan } from './iso-kit'
import { dropIn, useEnterMotion } from './scene-motion'
import type { Glide } from './scene-motion'
import { QUEUE_DRAW_CAP, TOKEN_Z, pitchFor, tokenPlan } from './queue-tray-geometry'
import type { TrayLayout } from './queue-tray-geometry'
import { at } from './scene-world'

/** What a tray holds at one position: queued ids, head first, and the id on the run pad. */
export interface TrayEntries {
  queued: readonly string[]
  running: string | null
}

const centreOf = (plan: Plan) => at([plan.x + plan.w / 2, plan.y + plan.d / 2, TOKEN_Z])

/**
 * How each token that is new to the tray at `current` arrives. A token that was waiting in
 * the trough one step earlier and is now on the run pad slides from its old slot onto the
 * pad; a token that was nowhere in the tray is lowered into the trough. Everything else
 * (tokens that were already there, any position with nothing to compare against) just sits.
 */
export function trayGlides(
  layout: TrayLayout,
  previous: TrayEntries | null,
  current: TrayEntries,
): Map<string, Glide> {
  const glides = new Map<string, Glide>()
  if (!previous) return glides
  const before = previous.queued.slice(0, QUEUE_DRAW_CAP)
  const pitch = pitchFor(layout, before.length)

  if (current.running !== null && current.running !== previous.running) {
    const slot = before.indexOf(current.running)
    if (slot >= 0) {
      const from = centreOf(tokenPlan(layout, slot, pitch))
      const to = centreOf(layout.running)
      glides.set(current.running, { dx: from[0] - to[0], dy: from[1] - to[1], fade: false })
    }
  }
  const known = new Set([...previous.queued, previous.running])
  for (const id of current.queued) {
    if (!known.has(id)) glides.set(id, dropIn())
  }
  return glides
}

/**
 * Enter hooks for a tray part. `idAttribute` is the data attribute carrying a token's id on
 * its element, which is how a hook finds the glide that belongs to the element entering.
 */
export function useTrayMotion(
  layout: TrayLayout,
  idAttribute: string,
  previous: () => TrayEntries | null,
  current: () => TrayEntries,
) {
  const glides = computed(() => trayGlides(layout, previous(), current()))
  return useEnterMotion((el) => glides.value.get(el.getAttribute(idAttribute) ?? '') ?? null)
}
