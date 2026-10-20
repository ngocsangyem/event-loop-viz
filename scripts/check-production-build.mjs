// Post-build gate for the production bundle (run after `pnpm run build-only`).
// Asserts the three things a deploy must not regress, then prints a size table:
//   1. the main chunk does not contain the engine (it lives in the lazily created Worker chunk)
//   2. the Worker chunk keeps real built-in function names (frame labels in the Trace, ADR-0001)
//   3. the built Worker, actually executed, emits those real names as frame labels
// Usage: node scripts/check-production-build.mjs [distDir]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import process from 'node:process'

const dist = resolve(process.argv[2] ?? 'dist')
const assets = join(dist, 'assets')
const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

const files = readdirSync(assets).filter((name) => name.endsWith('.js'))
const workerFile = files.find((name) => name.startsWith('run-script-worker'))
const mainFiles = files.filter((name) => name !== workerFile)
check(workerFile, 'no run-script-worker chunk in dist/assets: the engine is not split out')
check(mainFiles.length > 0, 'no main chunk in dist/assets')
if (failures.length > 0) fail()

// Markers that only exist inside the engine's source (module-scope strings and identifiers).
const ENGINE_MARKERS = ['CreateBuiltinFunction', 'HostPromiseRejectionTracker', 'ObjectValue']
for (const name of mainFiles) {
  const code = readFileSync(join(assets, name), 'utf8')
  for (const marker of ENGINE_MARKERS) {
    check(!code.includes(marker), `main chunk ${name} contains engine marker "${marker}"`)
  }
}

// The index must not preload the Worker chunk: it is fetched when the first Run starts.
const html = readFileSync(join(dist, 'index.html'), 'utf8')
check(!html.includes('run-script-worker'), 'index.html references the Worker chunk eagerly')

// Execute the built Worker with a fake worker scope and read the frame labels it emits.
let reply
globalThis.self = globalThis
globalThis.postMessage = (message) => {
  reply = message
}
await import(pathToFileURL(join(assets, workerFile)).href)
await globalThis.onmessage({
  data: { script: 'Promise.resolve().then(() => console.log(1))', settings: {} },
})
check(reply?.kind === 'ran', `built Worker did not complete a Run: ${JSON.stringify(reply)?.slice(0, 200)}`)
const labels = new Set(
  (reply?.trace?.events ?? []).filter((e) => e.k === 'frame:push').map((e) => e.label),
)
for (const expected of ['resolve', 'then', 'log', 'executorClosure', 'PromiseResolveFunctions']) {
  check(labels.has(expected), `built Worker frame labels lack real built-in name "${expected}": ${[...labels].join(', ')}`)
}
// A minifier that mangles names leaves 1-2 character labels behind.
const mangled = [...labels].filter((label) => /^[A-Za-z_$][\w$]?$/.test(label))
check(mangled.length === 0, `built Worker frame labels look minified: ${mangled.join(', ')}`)

if (failures.length > 0) fail()

console.log('production build checks passed\n')
console.log('chunk'.padEnd(46), 'raw kB'.padStart(10), 'gzip kB'.padStart(10))
for (const name of [...mainFiles, workerFile, ...readdirSync(assets).filter((n) => n.endsWith('.css'))]) {
  const path = join(assets, name)
  const raw = statSync(path).size
  const gz = gzipSync(readFileSync(path)).length
  console.log(name.padEnd(46), (raw / 1000).toFixed(1).padStart(10), (gz / 1000).toFixed(1).padStart(10))
}

function fail() {
  for (const message of failures) console.error(`FAIL: ${message}`)
  process.exit(1)
}
