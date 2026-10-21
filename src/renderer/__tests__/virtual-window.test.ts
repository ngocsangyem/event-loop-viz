import { describe, expect, it } from 'vitest'
import { EVENT_ROW_HEIGHT, indexOfSeq, VIRTUALIZE_ABOVE, visibleWindow } from '../virtual-window'

const base = { rowHeight: EVENT_ROW_HEIGHT, viewportHeight: 310, overscan: 5 }

describe('visibleWindow', () => {
  it('renders every row when the list is small', () => {
    expect(visibleWindow({ ...base, total: VIRTUALIZE_ABOVE, scrollTop: 0 })).toEqual({
      start: 0,
      end: VIRTUALIZE_ABOVE,
      virtual: false,
    })
  })

  it('renders only the rows in view plus the overscan for a long list', () => {
    // scrollTop 3100 / 31 = row 100; 310 / 31 = 10 rows in view.
    expect(visibleWindow({ ...base, total: 200_000, scrollTop: 3100 })).toEqual({
      start: 95,
      end: 115,
      virtual: true,
    })
  })

  it('clamps at both ends of the list', () => {
    expect(visibleWindow({ ...base, total: 200_000, scrollTop: 0 }).start).toBe(0)
    expect(visibleWindow({ ...base, total: 200_000, scrollTop: 8_000_000 }).end).toBe(200_000)
  })
})

describe('indexOfSeq', () => {
  const rows = [{ seq: 2 }, { seq: 5 }, { seq: 9 }]
  it('finds a row by seq', () => expect(indexOfSeq(rows, 5)).toBe(1))
  it('returns -1 for a seq that is filtered out', () => expect(indexOfSeq(rows, 6)).toBe(-1))
})

describe('EVENT_ROW_HEIGHT', () => {
  it('matches the 31px Trace Events line the list is drawn with', () => {
    expect(EVENT_ROW_HEIGHT).toBe(31)
  })
})
