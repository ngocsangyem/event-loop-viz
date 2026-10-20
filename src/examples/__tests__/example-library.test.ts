// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runScript } from '../../runner/run-script'
import { EXAMPLES } from '../example-library'

/**
 * Every example is an Oracle Fixture, so it is either compared with Chrome (recorded) or has a
 * simulator-side expectation in the skipped-fixtures test. Both are checked here.
 */
const fixturesDir = fileURLToPath(new URL('../../../oracle/fixtures/', import.meta.url))
const skippedExpectationsSource = readFileSync(
  fileURLToPath(new URL('../../runner/__tests__/skipped-fixtures.test.ts', import.meta.url)),
  'utf8',
)

describe('example library', () => {
  it('has unique ids and one-line descriptions', () => {
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length)
    for (const example of EXAMPLES) {
      expect(example.description).not.toMatch(/\n/)
      expect(example.description.length).toBeGreaterThan(0)
    }
  })

  for (const example of EXAMPLES) {
    describe(example.id, () => {
      it('is exactly the text of its Fixture', () => {
        expect(example.script).toBe(readFileSync(fixturesDir + example.fixture, 'utf8'))
      })

      it('is covered by the Oracle or a simulator-side expectation', () => {
        const goldenPath = fixturesDir + example.fixture.replace(/\.js$/, '.golden.json')
        expect(existsSync(goldenPath)).toBe(true)
        const golden = JSON.parse(readFileSync(goldenPath, 'utf8'))
        if (golden.status === 'skip') {
          expect(skippedExpectationsSource).toContain(`'${example.fixture}'`)
        } else {
          expect(golden.status).toBe('recorded')
        }
      })

      it('runs to a Trace', async () => {
        // Small node budget keeps the infinite-loop example fast.
        const result = await runScript(example.script, { budgets: { nodes: 20_000 } })
        expect(result.kind).toBe('ran')
      })
    })
  }
})
