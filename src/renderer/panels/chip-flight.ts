import { gsap } from 'gsap'

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
  ghost.classList.add('chip-ghost')
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

/** How far a chip lifts off its place before it travels, and how much it swells, so it reads as picked up. */
const POP_LIFT_PX = 6
const POP_SCALE = 1.05

/**
 * Flies a copy of `chip` from `from` to `to` inside `overlay`, and hides the real chip while the
 * copy is in the air. The copy pops out of where it was (a short lift and swell), travels on a
 * gentle curve (x and y ease differently) and settles into its place. `fromCode` fades the copy
 * in during the pop, since it leaves highlighted text rather than a chip. Nothing is left behind:
 * the copy is removed when it lands or is ended, and the real chip's opacity is cleared.
 */
export function flyChip(
  overlay: HTMLElement,
  chip: HTMLElement,
  from: ChipRect,
  to: ChipRect,
  duration: number,
  fromCode = false,
): Flight {
  const ghost = makeGhost(chip, to)
  overlay.appendChild(ghost)
  const seconds = duration / 1000
  let settle!: () => void
  const settled = new Promise<void>((resolve) => (settle = resolve))
  const cleanUp = () => {
    ghost.remove()
    gsap.set(chip, { clearProps: 'opacity' })
    settle()
  }

  gsap.set(chip, { opacity: 0 })
  const timeline = gsap.timeline({ onComplete: cleanUp })
  timeline
    .set(ghost, { x: from.left, y: from.top, width: from.width, transformOrigin: '50% 50%', force3D: true })
    .fromTo(
      ghost,
      { scale: fromCode ? 0.92 : 1, autoAlpha: fromCode ? 0 : 1 },
      { y: from.top - POP_LIFT_PX, scale: POP_SCALE, autoAlpha: 1, duration: seconds * 0.22, ease: 'power2.out' },
    )
    // Different eases on x and y bend the path into a curve instead of a straight slide.
    .addLabel('travel')
    .to(ghost, { x: to.left, width: to.width, duration: seconds * 0.6, ease: 'power3.inOut' }, 'travel')
    .to(ghost, { y: to.top - POP_LIFT_PX, duration: seconds * 0.6, ease: 'sine.inOut' }, 'travel')
    .to(ghost, { y: to.top, scale: 1, duration: seconds * 0.18, ease: 'back.out(2.2)' })

  return {
    settled,
    end() {
      timeline.kill()
      cleanUp()
    },
  }
}

/** A brief ring around a chip that arrived without a flight, so the eye still finds it. */
export function pulseChip(chip: HTMLElement): Flight {
  const ring = (alpha: number, size: number): Keyframe => ({
    boxShadow: `0 0 0 ${size}px color-mix(in oklab, var(--brand) ${alpha}%, transparent)`,
  })
  const pulse = chip.animate([ring(55, 0), ring(0, 6)], { duration: 450, easing: 'ease-out' })
  return { settled: Promise.allSettled([pulse.finished]), end: () => pulse.cancel() }
}
