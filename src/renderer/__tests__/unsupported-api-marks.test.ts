import { describe, expect, it } from 'vitest'
import { findUnsupportedUsages } from '../unsupported-api-marks'

describe('findUnsupportedUsages', () => {
  it('finds each reference with its 1-based line', () => {
    const text = "console.log('a')\nfetch('/x')\nwindow.foo()"
    expect(findUnsupportedUsages(text, ['fetch', 'window'])).toEqual([
      { api: 'fetch', from: 17, to: 22, line: 2 },
      { api: 'window', from: 29, to: 35, line: 3 },
    ])
  })

  it('skips strings, comments and property names', () => {
    const text = "const s = 'fetch'\n// fetch\nobj.fetch()\nconst o = { window: 1 }"
    expect(findUnsupportedUsages(text, ['fetch', 'window'])).toEqual([])
  })

  it('treats Atomics.wait as one reference and plain Atomics as fine', () => {
    expect(findUnsupportedUsages('Atomics.wait(a, 0, 0)', ['Atomics.wait'])).toEqual([
      { api: 'Atomics.wait', from: 0, to: 12, line: 1 },
    ])
    expect(findUnsupportedUsages('Atomics.add(a, 0, 1)', ['Atomics.wait'])).toEqual([])
  })

  it('finds nothing when no API is unsupported', () => {
    expect(findUnsupportedUsages('fetch()', [])).toEqual([])
  })
})
