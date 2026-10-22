import { describe, expect, it } from 'vitest'
import { placeDrivePopover } from '../place-drive-popover'

const size = { width: 300, height: 120 }
const viewport = { width: 1440, height: 900 }
const at = (left: number, top: number, width = 200, height = 100) => ({ left, top, width, height })

describe('placeDrivePopover', () => {
  it('prefers below the spot, aligned to its left edge', () => {
    expect(placeDrivePopover({ spot: at(100, 100), size, viewport, bottomReserve: 0 })).toEqual({ left: 100, top: 212, side: 'below' })
  })

  it('goes above when the dock leaves no room below', () => {
    const placed = placeDrivePopover({ spot: at(100, 600), size, viewport, bottomReserve: 200 })
    expect(placed).toEqual({ left: 100, top: 468, side: 'above' })
  })

  it('goes beside a spot that fills the height', () => {
    expect(placeDrivePopover({ spot: at(100, 20, 300, 860), size, viewport, bottomReserve: 0 }).side).toBe('right')
    expect(placeDrivePopover({ spot: at(1000, 20, 420, 860), size, viewport, bottomReserve: 0 }).side).toBe('left')
  })

  it('clamps inside the 16px gutter', () => {
    expect(placeDrivePopover({ spot: at(1300, 100), size, viewport, bottomReserve: 0 }).left).toBe(1440 - 16 - 300)
  })

  it('uses a bottom sheet on phones and when there is no spot', () => {
    const phone = { width: 375, height: 812 }
    expect(placeDrivePopover({ spot: at(0, 0), size, viewport: phone, bottomReserve: 100 })).toEqual({ left: 16, top: 576, side: 'sheet' })
    expect(placeDrivePopover({ spot: null, size, viewport, bottomReserve: 0 }).side).toBe('sheet')
  })
})
