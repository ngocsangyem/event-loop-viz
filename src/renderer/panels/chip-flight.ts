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
function makeGhost(chip: Element, width: number, height: number): HTMLElement {
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
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: 'none',
  })
  return ghost
}

/** Where a ghost is at one instant of its flight, so a new step can carry on from exactly there. */
export interface FlightPose {
  x: number
  y: number
  scale: number
  alpha: number
  /** Width of the ghost's visible part; the rest is clipped off its right edge. */
  visibleWidth: number
  height: number
}

/** The on-screen box of a pose, for the "can it be followed" check. */
export const poseRect = (pose: FlightPose): ChipRect => ({
  left: pose.x,
  top: pose.y,
  width: pose.visibleWidth,
  height: pose.height,
})

/**
 * What a flight or pulse left running. `end` is synchronous: a cancelled Animation only reports
 * it in a later event, so the ghost is removed here and never waits for that event.
 */
export interface Flight {
  /** Settles when every animation of the flight has finished or been cancelled. */
  settled: Promise<unknown>
  end: () => void
  /** Where the ghost is right now; null once it has landed or been ended. Pulses have none. */
  pose?: () => FlightPose | null
}

export interface FlightOptions {
  /** The copy leaves highlighted code rather than a chip, so it fades in while it pops. */
  fromCode?: boolean
  /** A ghost of the same chip was in the air: start from its pose and skip the pop. */
  resume?: FlightPose
}

/** How far a chip lifts off its place before it travels, and how much it swells, so it reads as picked up. */
const POP_LIFT_PX = 6
const POP_SCALE = 1.05
/** Shares of the flight: pop, travel, settle. A resumed flight folds the pop into the travel. */
const POP_SHARE = 0.22
const SETTLE_SHARE = 0.18

/**
 * Flies a copy of `chip` from `from` to `to` inside `overlay`, and hides the real chip while the
 * copy is in the air. The copy pops out of where it was (a short lift and swell), travels on a
 * gentle curve (x and y ease differently) and settles into its place.
 *
 * Only transform and opacity animate per frame, plus a clip for the width: the ghost is laid
 * out once at the wider of the two widths and its right edge is clipped, so a lane change in
 * width never re-lays out the text. Nothing is left behind: the copy is removed when it lands
 * or is ended, and the real chip's opacity is cleared.
 */
export function flyChip(
  overlay: HTMLElement,
  chip: HTMLElement,
  from: ChipRect,
  to: ChipRect,
  duration: number,
  options: FlightOptions = {},
): Flight {
  const { fromCode = false, resume } = options
  const startWidth = resume?.visibleWidth ?? from.width
  const width = Math.max(startWidth, to.width)
  const ghost = makeGhost(chip, width, to.height)
  overlay.appendChild(ghost)
  const clip = { visible: startWidth }
  const applyClip = () => (ghost.style.clipPath = `inset(0px ${width - clip.visible}px 0px 0px)`)
  applyClip()

  const seconds = duration / 1000
  let done = false
  let settle!: () => void
  const settled = new Promise<void>((resolve) => (settle = resolve))
  const cleanUp = () => {
    if (done) return
    done = true
    ghost.remove()
    gsap.set(chip, { clearProps: 'opacity' })
    settle()
  }

  gsap.set(chip, { opacity: 0 })
  const timeline = gsap.timeline({ onComplete: cleanUp })
  timeline.set(ghost, { transformOrigin: '50% 50%', force3D: true })
  if (resume) {
    timeline.set(ghost, { x: resume.x, y: resume.y, scale: resume.scale, autoAlpha: resume.alpha })
  } else {
    timeline
      .set(ghost, { x: from.left, y: from.top })
      .fromTo(
        ghost,
        { scale: fromCode ? 0.92 : 1, autoAlpha: fromCode ? 0 : 1 },
        { y: from.top - POP_LIFT_PX, scale: POP_SCALE, autoAlpha: 1, duration: seconds * POP_SHARE, ease: 'power2.out' },
      )
  }
  // Different eases on x and y bend the path into a curve instead of a straight slide.
  const travel = seconds * (1 - SETTLE_SHARE - (resume ? 0 : POP_SHARE))
  timeline
    .addLabel('travel')
    .to(ghost, { x: to.left, scale: POP_SCALE, autoAlpha: 1, duration: travel, ease: 'power3.inOut' }, 'travel')
    .to(clip, { visible: to.width, duration: travel, ease: 'power3.inOut', onUpdate: applyClip }, 'travel')
    .to(ghost, { y: to.top - POP_LIFT_PX, duration: travel, ease: 'sine.inOut' }, 'travel')
    .to(ghost, { y: to.top, scale: 1, duration: seconds * SETTLE_SHARE, ease: 'back.out(2.2)' })

  return {
    settled,
    end() {
      timeline.kill()
      cleanUp()
    },
    pose() {
      if (done) return null
      const read = (name: string) => Number(gsap.getProperty(ghost, name))
      return { x: read('x'), y: read('y'), scale: read('scale'), alpha: read('opacity'), visibleWidth: clip.visible, height: to.height }
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
