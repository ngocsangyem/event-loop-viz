// Gate for the oracle differential job: fails when any fixture fails that is
// not on the known-failures list, so a PR that breaks a Fixture goes red while
// not-yet-implemented behavior does not block unrelated work.
// Usage: node check-oracle-report.mjs <vitest-json-report> <known-failures-file>
import { readFileSync } from 'node:fs'
import process from 'node:process'

const [reportPath, knownPath] = process.argv.slice(2)
if (!reportPath || !knownPath) {
  console.error('usage: check-oracle-report.mjs <report.json> <known-failures.txt>')
  process.exit(2)
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const known = new Set(
  readFileSync(knownPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
)

const results = report.testResults.flatMap((file) => file.assertionResults)
if (results.length === 0) {
  console.error('oracle report contains no test results')
  process.exit(1)
}

const failed = results.filter((t) => t.status === 'failed').map((t) => t.title)
const passed = new Set(results.filter((t) => t.status === 'passed').map((t) => t.title))

const unexpected = failed.filter((title) => !known.has(title))
const nowGreen = [...known].filter((title) => passed.has(title))

for (const title of nowGreen) {
  console.log(`::warning::${title} now passes; remove it from ${knownPath}`)
}
if (unexpected.length > 0) {
  for (const title of unexpected) console.log(`::error::oracle fixture failing: ${title}`)
  process.exit(1)
}
console.log(`oracle: ${failed.length} failing, all on the known-failures list`)
