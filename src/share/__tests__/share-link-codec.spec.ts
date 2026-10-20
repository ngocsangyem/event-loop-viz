// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decodeShareFragment, encodeShareFragment } from '../share-link-codec'

describe('share link codec', () => {
  it('round-trips a Script with Unicode and settings', () => {
    const payload = {
      script: "console.log('héllo wörld — 日本語 🚀')\n",
      settings: { budgets: { nodes: 5000 }, nodeCostUs: 3, randomSeed: 42 },
    }
    expect(decodeShareFragment(encodeShareFragment(payload))).toEqual(payload)
  })

  it('round-trips several kB of text', () => {
    const script = Array.from({ length: 300 }, (_, i) => `console.log('line ${i} ✓')`).join('\n')
    expect(script.length).toBeGreaterThan(5000)
    expect(decodeShareFragment(encodeShareFragment({ script, settings: {} }))?.script).toBe(script)
  })

  it('produces a URL-safe fragment', () => {
    const fragment = encodeShareFragment({ script: '???>>>~~~', settings: {} })
    expect(fragment).toMatch(/^#share=[A-Za-z0-9_-]+$/)
  })

  it('decodes a hand-written fragment', () => {
    // {"v":1,"script":"1","settings":{}} in base64url
    expect(decodeShareFragment('#share=eyJ2IjoxLCJzY3JpcHQiOiIxIiwic2V0dGluZ3MiOnt9fQ')).toEqual({
      script: '1',
      settings: {},
    })
  })

  it.each(['', '#', '#other=abc', '#share=!!!', '#share=bm90LWpzb24', '#share=eyJ2IjoyfQ'])(
    'returns null for unusable fragment %j',
    (fragment) => {
      expect(decodeShareFragment(fragment)).toBeNull()
    },
  )
})
