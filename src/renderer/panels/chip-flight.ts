import { MOTION_EASE } from '../scene/scene-motion'

/** Where a chip is on screen, in viewport pixels. */
export interface ChipRect {
  left: number
  top: number
  width: number
  height: number
}

export const rectOf = (el: Element): ChipRect => {
  const { left, top, width, height } = el.getBoundingClientRect()
  return { left, top, width, height }
}

/** Whether any part of the rect is in the viewport; a chip scrolled away cannot be followed. */
export function isOnScreen(rect: ChipRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.left < window.innerWidth &&
    rect.left + rect.width > 0 &&
    rect.top < window.innerHeight &&
    rect.top + rect.height > 0
  )
}

/** A copy of a chip that can sit in the overlay: nothing in it may be found or announced twice. */
function makeGhost(chip: Element, to: ChipRect): HTMLElement {
  const ghost = chip.cloneNode(true) as HTMLElement
  for (const attr of ['id', 'data-testid', 'data-chip-id', 'role', 'aria-label', 'title']) {
    ghost.removeAttribute(attr)
  }
  ghost.classList.add('chip-ghost', 'shadow-md')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    margin: '0',
    height: `${to.height}px`,
    pointerEvents: 'none',
  })
  return ghost
}

/**
 * What a flight or pulse left running. `end` is synchronous: a cancelled Animation only reports
 * it in a later event, so the ghost is removed here and never waits for that event.
 */
export interface Flight {
  /** Settles when every animation of the flight has finished or been cancelled. */
  settled: Promise<unknown>
  end: () => void
}

/**
 * Flies a copy of `chip` from `from` to `to` inside `overlay`, and hides the real chip while the
 * copy is in the air. Both animations leave nothing behind: no fill, and the copy is removed
 * when it lands or is ended. The caller ends a flight with `end`, which removes the copy at once.
 */
export function flyChip(
  overlay: HTMLElement,
  chip: HTMLElement,
  from: ChipRect,
  to: ChipRect,
  duration: number,
): Flight {
  const ghost = makeGhost(chip, to)
  overlay.appendChild(ghost)
  const flight = ghost.animate(
    [
      { transform: `translate(${from.left}px, ${from.top}px)`, width: `${from.width}px` },
      { transform: `translate(${to.left}px, ${to.top}px)`, width: `${to.width}px` },
    ],
    { duration, easing: MOTION_EASE },
  )
  flight.onfinish = () => ghost.remove()
  const hidden = chip.animate([{ opacity: 0 }, { opacity: 0 }], { duration })
  return {
    settled: Promise.allSettled([flight.finished, hidden.finished]),
    end() {
      flight.cancel()
      hidden.cancel()
      ghost.remove()
    },
  }
}

/** A brief ring around a chip that arrived without a flight, so the eye still finds it. */
export function pulseChip(chip: HTMLElement): Flight {
  const ring = (alpha: number, size: number): Keyframe => ({
    boxShadow: `0 0 0 ${size}px color-mix(in oklab, var(--primary) ${alpha}%, transparent)`,
  })
  const pulse = chip.animate([ring(55, 0), ring(0, 6)], { duration: 450, easing: 'ease-out' })
  return { settled: Promise.allSettled([pulse.finished]), end: () => pulse.cancel() }
}
