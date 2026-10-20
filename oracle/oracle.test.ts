import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runScript } from '../src/runner/run-script'
import type { ObservableOutput } from '../src/trace/observable-output'

interface Golden {
  fixture: string
  oracle: { browser: string; version: string }
  status: 'recorded' | 'skip'
  skipReason: string | null
  observableOutput: ObservableOutput
}

const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url))
const fixtures = readdirSync(fixturesDir).filter((f) => f.endsWith('.js')).sort()

describe('Observable Output matches the Chrome Oracle', () => {
  it('has at least one fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  for (const file of fixtures) {
    const goldenPath = join(fixturesDir, file.replace(/\.js$/, '.golden.json'))
    if (!existsSync(goldenPath)) {
      it(`${file}: has a golden file (run pnpm oracle:record)`, () => {
        expect.fail(`missing ${goldenPath}`)
      })
      continue
    }
    const golden: Golden = JSON.parse(readFileSync(goldenPath, 'utf8'))
    if (golden.status === 'skip') {
      it.skip(`${file} (skipped: ${golden.skipReason})`, () => {})
      continue
    }
    it(file, async () => {
      const source = readFileSync(join(fixturesDir, file), 'utf8')
      const { observableOutput } = await runScript(source)
      expect(observableOutput).toEqual(golden.observableOutput)
    })
  }
})
