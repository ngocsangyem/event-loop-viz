import { shallowRef } from 'vue'
import type { Ref } from 'vue'

/**
 * Where an item that has just appeared starts from, relative to its resting place, in the
 * drawing's own units, and whether it fades in. Motion is only ever a path from that start to
 * the place the state puts the item, so once it ends the DOM is exactly what a Scene that
 * never animated would draw.
 */
export interface Glide {
  dx: number
  dy: number
  fade: boolean
}

export const MOTION_MS = 440
/** Calm ease-out: quick to leave, long settle. */
export const MOTION_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

/** A new item lowered into its place from just above it. */
export const dropIn = (height = 14): Glide => ({ dx: 0, dy: -height, fade: true })
/** A new item that stays where it is and only fades up. */
export const fadeIn: Glide = { dx: 0, dy: 0, fade: true }

const reduced = shallowRef(false)
let watching = false

/**
 * Whether the user asked the system for less motion. One shared reactive flag, because the
 * preference is global; it follows live changes of the setting.
 */
export function usePrefersReducedMotion(): Ref<boolean> {
  if (!watching && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    watching = true
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = query.matches
    query.addEventListener('change', (event) => {
      reduced.value = event.matches
    })
  }
  return reduced
}

/**
 * Enter hooks for `<Transition>` / `<TransitionGroup :css="false">`. `glideOf` says where the
 * entering element comes from, or null when it should simply appear (nothing to compare it
 * with, as after a jump). The animation runs through the Web Animations API with no fill, so
 * it leaves no class, style or attribute behind, and it never starts under reduced motion.
 */
export function useEnterMotion(glideOf: (el: Element) => Glide | null) {
  const motionless = usePrefersReducedMotion()
  const running = new WeakMap<Element, Animation>()

  function onEnter(el: Element, done: () => void) {
    const glide = motionless.value ? null : glideOf(el)
    if (!glide || typeof el.animate !== 'function') {
      done()
      return
    }
    const from: Keyframe = { transform: `translate(${glide.dx}px, ${glide.dy}px)` }
    if (glide.fade) from.opacity = 0
    const animation = el.animate([from, { transform: 'translate(0px, 0px)', opacity: 1 }], {
      duration: MOTION_MS,
      easing: MOTION_EASE,
      fill: 'backwards',
    })
    running.set(el, animation)
    animation.onfinish = animation.oncancel = () => done()
  }

  function onEnterCancelled(el: Element) {
    running.get(el)?.cancel()
  }

  return { onEnter, onEnterCancelled }
}

/**
 * Ids present now that were not there one step earlier. Without a previous state there is
 * nothing to compare with, so nothing counts as an arrival.
 */
export function arrivals(
  previous: readonly string[] | null,
  current: readonly string[],
): Set<string> {
  if (previous === null) return new Set()
  const before = new Set(previous)
  return new Set(current.filter((id) => !before.has(id)))
}
