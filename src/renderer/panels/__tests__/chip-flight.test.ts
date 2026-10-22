import { afterEach, describe, expect, it } from 'vitest'
import { flyChip } from '../chip-flight'

/** An Animation stand-in that, like a hidden tab, never reports finish or cancel on its own. */
function stalledAnimation(): Animation {
  return { cancel() {}, finished: new Promise(() => {}) } as unknown as Animation
}

function setup() {
  const overlay = document.createElement('div')
  const chip = document.createElement('span')
  chip.dataset.chipId = 'a'
  chip.animate = stalledAnimation as unknown as typeof chip.animate
  // Ghost is a clone: cloneNode does not copy own properties, so give every element the stub.
  HTMLElement.prototype.animate = stalledAnimation as unknown as typeof HTMLElement.prototype.animate
  const rect = { left: 0, top: 0, width: 10, height: 10 }
  return { overlay, chip, rect }
}

describe('flyChip', () => {
  afterEach(() => {
    delete (HTMLElement.prototype as { animate?: unknown }).animate
  })

  it('removes the ghost as soon as the flight is ended, without waiting for an animation event', () => {
    const { overlay, chip, rect } = setup()
    const flight = flyChip(overlay, chip, rect, rect, 450)
    expect(overlay.querySelectorAll('.chip-ghost')).toHaveLength(1)
    flight.end()
    expect(overlay.querySelectorAll('.chip-ghost')).toHaveLength(0)
  })

  it('does not leave attributes that would make the ghost a second copy of the chip', () => {
    const { overlay, chip, rect } = setup()
    flyChip(overlay, chip, rect, rect, 450)
    expect(overlay.querySelector('.chip-ghost')?.hasAttribute('data-chip-id')).toBe(false)
  })

  it('lays the ghost out once at the wider width and clips it to the starting width', () => {
    const { overlay, chip } = setup()
    flyChip(overlay, chip, { left: 0, top: 0, width: 40, height: 10 }, { left: 0, top: 50, width: 100, height: 10 }, 450)
    const ghost = overlay.querySelector<HTMLElement>('.chip-ghost')!
    expect(ghost.style.width).toBe('100px')
    expect(ghost.style.clipPath).toBe('inset(0px 60px 0px 0px)')
  })

  it('reports a pose while in the air and none once ended, and gives the real chip its opacity back', () => {
    const { overlay, chip, rect } = setup()
    const flight = flyChip(overlay, chip, rect, rect, 450)
    expect(chip.style.opacity).toBe('0')
    expect(flight.pose?.()).toMatchObject({ visibleWidth: 10, height: 10 })
    flight.end()
    expect(flight.pose?.()).toBeNull()
    expect(chip.style.opacity).toBe('')
  })

  it('resumes from a pose instead of popping out of the origin again', () => {
    const { overlay, chip, rect } = setup()
    const resume = { x: 30, y: 20, scale: 1.05, alpha: 1, visibleWidth: 10, height: 10 }
    const flight = flyChip(overlay, chip, rect, { ...rect, left: 90 }, 450, { resume })
    expect(flight.pose?.()).toMatchObject({ x: 30, y: 20, scale: 1.05 })
    flight.end()
  })
})
