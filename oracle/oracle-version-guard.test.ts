import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runScript } from '../src/runner/run-script'
import { goldenMatchesHostProfile } from './oracle-version-guard'

const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url))
const goldens = readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.golden.json'))
  .sort()

describe('Oracle version guard', () => {
  it('compares the Chrome major, not the full version string', () => {
    expect(goldenMatchesHostProfile('155.0.8059.85', 'chrome-155')).toBe(true)
    expect(goldenMatchesHostProfile('155.0.1.1', 'chrome-155')).toBe(true)
    expect(goldenMatchesHostProfile('154.0.8059.85', 'chrome-155')).toBe(false)
    expect(goldenMatchesHostProfile('1550.0.0.0', 'chrome-155')).toBe(false)
  })

  it('finds goldens to guard', () => {
    expect(goldens.length).toBeGreaterThan(0)
  })

  it('every Golden was recorded by the Chrome major of the Host Profile the simulator reports', async () => {
    const result = await runScript('')
    if (result.kind !== 'ran') throw new Error('empty script must run')
    const { hostProfile } = result.trace.header
    const mismatched = goldens.filter((file) => {
      const golden = JSON.parse(readFileSync(fixturesDir + file, 'utf8'))
      return !goldenMatchesHostProfile(golden.oracle.version, hostProfile)
    })
    expect(mismatched).toEqual([])
  })
})
