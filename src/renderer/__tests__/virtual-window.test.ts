import { describe, expect, it } from 'vitest'
import { indexOfSeq, VIRTUALIZE_ABOVE, visibleWindow } from '../virtual-window'

const base = { rowHeight: 20, viewportHeight: 200, overscan: 5 }

describe('visibleWindow', () => {
  it('renders every row when the list is small', () => {
    expect(visibleWindow({ ...base, total: VIRTUALIZE_ABOVE, scrollTop: 0 })).toEqual({
      start: 0,
      end: VIRTUALIZE_ABOVE,
      virtual: false,
    })
  })

  it('renders only the rows in view plus the overscan for a long list', () => {
    // scrollTop 2000 / 20 = row 100; 200 / 20 = 10 rows in view.
    expect(visibleWindow({ ...base, total: 200_000, scrollTop: 2000 })).toEqual({
      start: 95,
      end: 115,
      virtual: true,
    })
  })

  it('clamps at both ends of the list', () => {
    expect(visibleWindow({ ...base, total: 200_000, scrollTop: 0 }).start).toBe(0)
    expect(visibleWindow({ ...base, total: 200_000, scrollTop: 4_000_000 }).end).toBe(200_000)
  })
})

describe('indexOfSeq', () => {
  const rows = [{ seq: 2 }, { seq: 5 }, { seq: 9 }]
  it('finds a row by seq', () => expect(indexOfSeq(rows, 5)).toBe(1))
  it('returns -1 for a seq that is filtered out', () => expect(indexOfSeq(rows, 6)).toBe(-1))
})
