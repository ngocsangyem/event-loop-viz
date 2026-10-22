import type { DriveRect } from './drive-target-rect'

export interface PopoverPlacement {
  left: number
  top: number
  /** Where the popover sits relative to the spot; `sheet` is the phone's bottom sheet. */
  side: 'below' | 'above' | 'right' | 'left' | 'over' | 'sheet'
}

export interface PlacementInput {
  spot: DriveRect | null
  size: { width: number; height: number }
  viewport: { width: number; height: number }
  /** Space kept free at the bottom (the pinned dock). */
  bottomReserve: number
  gutter?: number
  gap?: number
  /** Viewports narrower than this get the bottom sheet. */
  sheetBelow?: number
}

/**
 * Where the step popover goes: below the spot, else above, else to its right or left, else
 * over the spot clamped inside the viewport. Phones (and a missing spot) get a bottom sheet
 * above the dock. Pure, so every case is unit-tested without a browser.
 */
export function placeDrivePopover(input: PlacementInput): PopoverPlacement {
  const { spot, size, viewport, bottomReserve, gutter = 16, gap = 12, sheetBelow = 640 } = input
  const floor = viewport.height - bottomReserve - gutter
  const clampX = (x: number) => Math.min(Math.max(x, gutter), viewport.width - gutter - size.width)
  const clampY = (y: number) => Math.min(Math.max(y, gutter), floor - size.height)

  if (!spot || viewport.width < sheetBelow) {
    return { left: gutter, top: Math.max(gutter, floor - size.height), side: 'sheet' }
  }
  const below = spot.top + spot.height + gap
  if (below + size.height <= floor) return { left: clampX(spot.left), top: below, side: 'below' }
  const above = spot.top - gap - size.height
  if (above >= gutter) return { left: clampX(spot.left), top: above, side: 'above' }
  const right = spot.left + spot.width + gap
  if (right + size.width <= viewport.width - gutter) return { left: right, top: clampY(spot.top), side: 'right' }
  const left = spot.left - gap - size.width
  if (left >= gutter) return { left, top: clampY(spot.top), side: 'left' }
  return { left: clampX(spot.left + gap), top: clampY(spot.top + gap), side: 'over' }
}
