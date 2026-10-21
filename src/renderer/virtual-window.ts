/** Height of one Trace Events line (event row or group header), in px. Windowing relies on it being fixed. */
export const EVENT_ROW_HEIGHT = 31

/** Lists up to this many rows render in full; longer ones render only the rows in view. */
export const VIRTUALIZE_ABOVE = 1000

export interface WindowInput {
  total: number
  rowHeight: number
  viewportHeight: number
  scrollTop: number
  /** Extra rows rendered above and below the view so fast scrolling does not show blanks. */
  overscan: number
}

export interface RowWindow {
  /** First rendered row index. */
  start: number
  /** One past the last rendered row index. */
  end: number
  virtual: boolean
}

/** Fixed-height windowing: which slice of `total` rows to put in the DOM. */
export function visibleWindow(input: WindowInput): RowWindow {
  const { total, rowHeight, viewportHeight, scrollTop, overscan } = input
  if (total <= VIRTUALIZE_ABOVE) return { start: 0, end: total, virtual: false }
  const first = Math.floor(scrollTop / rowHeight)
  const inView = Math.ceil(viewportHeight / rowHeight)
  return {
    start: Math.min(Math.max(first - overscan, 0), total),
    end: Math.min(first + inView + overscan, total),
    virtual: true,
  }
}

/** Binary search: rows are sorted by seq. Returns -1 when the seq is not in the list. */
export function indexOfSeq(rows: readonly { seq: number }[], seq: number): number {
  let low = 0
  let high = rows.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    const value = rows[mid]!.seq
    if (value === seq) return mid
    if (value < seq) low = mid + 1
    else high = mid - 1
  }
  return -1
}
