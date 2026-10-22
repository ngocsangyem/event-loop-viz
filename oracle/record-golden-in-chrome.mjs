// Records the Oracle's Observable Output for every fixture by running it in real Chrome
// Writes fixtures/<name>.golden.json next to each fixture.
// Usage: pnpm oracle:record [fixture-name ...]
//
// Fixture directives (each on its own line):
//   // @oracle-skip: <reason>   no Golden, the reason is recorded instead
//   // @oracle-module           the Fixture runs as <script type="module">
//   // @oracle-isolated         the page is cross-origin isolated (served over http with COOP/COEP)
//   // @fetch <url> ...         a canned network response (src/host/fetch-mock-directives.ts)
import { chromium } from '@playwright/test'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFetchMocks } from '../src/host/fetch-mock-directives.ts'

const PINNED_CHROME_MAJOR = 155 // Host Profile chrome-155
const RUNS_PER_FIXTURE = 5 // outputs must agree across all runs, else the fixture is non-deterministic
const SETTLE_MS = 400 // longest fixture timer is 50ms; leave headroom for clamped/nested timers

const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url))
const only = new Set(process.argv.slice(2))
const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.golden.json'))
  .filter((f) => only.size === 0 || only.has(basename(f, '.js')))
  .sort()

// Installed before the fixture runs. Captures console calls and the window events that make up the
// Observable Output. formatValue is the shared canonical formatter (minimal for now: fixtures only log primitives).
const HARNESS = `
window.__oracle = [];
const formatValue = (v) => (typeof v === 'string' ? v : String(v));
const errorText = (e) => (e instanceof Error ? e.message : formatValue(e));
for (const level of ['log', 'info', 'warn', 'error']) {
  console[level] = (...args) => window.__oracle.push({ kind: 'console', level, text: args.map(formatValue).join(' ') });
}
addEventListener('error', (e) => window.__oracle.push({ kind: 'uncaught-exception', message: e.error !== undefined ? errorText(e.error) : e.message }));
addEventListener('unhandledrejection', (e) => window.__oracle.push({ kind: 'unhandled-rejection', message: errorText(e.reason) }));
addEventListener('rejectionhandled', (e) => window.__oracle.push({ kind: 'rejection-handled', message: errorText(e.reason) }));
`

const skipDirective = (src) => src.match(/^\/\/ @oracle-skip:\s*(.+)$/m)?.[1].trim() ?? null
const hasDirective = (src, name) => new RegExp(`^// @${name}\\s*$`, 'm').test(src)

// The harness sits in <head>, the Fixture in <body>, so `document.body` exists while it runs.
const pageHtml = (source) =>
  `<!doctype html><html><head><script>${HARNESS}</script></head>` +
  `<body><script${hasDirective(source, 'oracle-module') ? ' type="module"' : ''}>${source}</script></body></html>`

// Serves the page for isolated Fixtures; COOP + COEP make the page cross-origin isolated.
let served = ''
const server = createServer((_req, res) => {
  res.writeHead(200, {
    'content-type': 'text/html',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
  })
  res.end(served)
}).listen(0)
const isolatedUrl = `http://localhost:${server.address().port}/`

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--js-flags=--expose-gc'] })
const version = browser.version()
if (Number(version.split('.')[0]) !== PINNED_CHROME_MAJOR) {
  await browser.close()
  server.close()
  throw new Error(`Chrome ${version} does not match pinned major ${PINNED_CHROME_MAJOR}; add a new Host Profile first`)
}

async function runOnce(source) {
  const page = await browser.newPage()
  try {
    for (const mock of parseFetchMocks(source)) {
      // A predicate, not a glob: `?` and `*` in a URL must match literally.
      const href = new URL(mock.url).href
      await page.route((url) => url.href === href, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, mock.latencyMs))
        await route.fulfill({
          status: mock.status,
          body: mock.body,
          headers: { 'access-control-allow-origin': '*', 'content-type': mock.contentType },
        })
      })
    }
    // Classic <script> tags in a fresh page: the fixture runs as a script Task at timer nesting level 0.
    if (hasDirective(source, 'oracle-isolated')) {
      served = pageHtml(source)
      await page.goto(isolatedUrl)
    } else {
      await page.setContent(pageHtml(source))
    }
    await page.waitForTimeout(SETTLE_MS)
    return await page.evaluate(() => window.__oracle)
  } finally {
    await page.close()
  }
}

let recorded = 0
let skipped = 0
for (const file of fixtures) {
  const source = readFileSync(join(fixturesDir, file), 'utf8')
  const golden = { fixture: file, oracle: { browser: 'chrome', version }, status: 'recorded', skipReason: null, observableOutput: [] }
  const declared = skipDirective(source)
  if (declared) {
    Object.assign(golden, { status: 'skip', skipReason: declared })
  } else {
    const runs = []
    for (let i = 0; i < RUNS_PER_FIXTURE; i++) runs.push(JSON.stringify(await runOnce(source)))
    if (new Set(runs).size > 1) {
      Object.assign(golden, { status: 'skip', skipReason: `non-deterministic in Chrome across ${RUNS_PER_FIXTURE} runs` })
    } else {
      golden.observableOutput = JSON.parse(runs[0])
    }
  }
  golden.status === 'skip' ? skipped++ : recorded++
  writeFileSync(join(fixturesDir, file.replace(/\.js$/, '.golden.json')), JSON.stringify(golden, null, 2) + '\n')
  console.log(`${golden.status === 'skip' ? 'SKIP  ' : 'RECORD'} ${file}${golden.skipReason ? `  (${golden.skipReason})` : ''}`)
}
await browser.close()
server.close()
console.log(`\nChrome ${version}: ${recorded} recorded, ${skipped} skipped`)
