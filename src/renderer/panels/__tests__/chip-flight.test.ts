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
})
