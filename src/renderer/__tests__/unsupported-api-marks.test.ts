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

  it('finds nothing when no API is unsupported', () => {
    expect(findUnsupportedUsages('fetch()', [])).toEqual([])
  })
})
