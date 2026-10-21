// Grading captures for the custom-element preview cards in ds-bundle/ (run emit-ds-bundle.mjs
// first). The design-sync validator measures light-DOM text, which is blind to shadow roots; this
// script pierces them. Per card it writes, under ds-bundle/_screenshots/review/:
//   <group>__<Name>.dark.png / .light.png — the whole card at the product pane width (728px)
// and ds-bundle/.capture-report.json with, per story cell, the text and painted-element count
// found inside its custom elements' shadow roots plus any page errors. A cell with no shadow text
// and nothing painted, or any page error, is reported as a failure (exit 1).
// Usage: node design-system/scripts/capture-ds-previews.mjs [--components A,B]
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = join(ROOT, 'ds-bundle')
const REVIEW = join(OUT, '_screenshots/review')
const only = (() => {
  const i = process.argv.indexOf('--components')
  return i > 0 ? new Set(process.argv[i + 1].split(',')) : null
})()
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }

const server = createServer((req, res) => {
  const path = join(OUT, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!path.startsWith(OUT) || !existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const cards = []
for (const group of readdirSync(join(OUT, 'components'))) {
  for (const name of readdirSync(join(OUT, 'components', group))) {
    if (!only || only.has(name)) cards.push({ group, name, rel: `components/${group}/${name}/${name}.html` })
  }
}

/** Runs in the page: shadow-root text + painted-element count for each `.ds-cell`. */
function measureCells() {
  const paints = (el) => {
    const cs = getComputedStyle(el)
    if (!/^(rgba\(0, 0, 0, 0\)|transparent)$/.test(cs.backgroundColor)) return true
    if (cs.boxShadow !== 'none') return true
    return ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0)
  }
  const walk = (root, acc) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        acc.text += ' ' + [...el.shadowRoot.querySelectorAll('*')].map((n) => [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join('')).join(' ')
        for (const n of el.shadowRoot.querySelectorAll('*')) if (paints(n)) acc.painted++
        walk(el.shadowRoot, acc)
      }
    }
    return acc
  }
  return [...document.querySelectorAll('.ds-cell')].map((cell) => {
    const acc = walk(cell, { text: '', painted: 0 })
    return { story: cell.dataset.story, text: acc.text.replace(/\s+/g, ' ').trim().slice(0, 160), painted: acc.painted, height: Math.round(cell.getBoundingClientRect().height) }
  })
}

mkdirSync(REVIEW, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 728, height: 600 } })
let errors = []
page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]))
const report = []
let failed = 0
try {
  for (const c of cards) {
    errors = []
    await page.goto(`${base}/${c.rel}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const cells = await page.evaluate(measureCells)
    await page.screenshot({ path: join(REVIEW, `${c.group}__${c.name}.dark.png`), fullPage: true })
    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'))
    await page.screenshot({ path: join(REVIEW, `${c.group}__${c.name}.light.png`), fullPage: true })
    // Each story must also render alone (the ?story= single-cell mode the app uses).
    for (const cell of cells) {
      await page.goto(`${base}/${c.rel}?story=${encodeURIComponent(cell.story)}`, { waitUntil: 'networkidle' })
      const [solo] = await page.evaluate(measureCells)
      cell.soloOk = !!solo && (solo.text.length > 0 || solo.painted > 0)
    }
    const bad = cells.filter((x) => (!x.text && !x.painted) || !x.soloOk).map((x) => x.story)
    if (bad.length || errors.length) failed++
    report.push({ ...c, cells, errors, bad })
    console.error(`${bad.length || errors.length ? '✗' : '✓'} ${c.group}/${c.name}: ${cells.length} cell(s)${bad.length ? ` empty: ${bad.join(', ')}` : ''}${errors.length ? ` errors: ${errors[0]}` : ''}`)
  }
} finally {
  await browser.close()
  server.close()
}
writeFileSync(join(OUT, '.capture-report.json'), JSON.stringify(report, null, 2))
console.error(`${cards.length} card(s) captured → ${REVIEW}`)
process.exit(failed ? 1 : 0)
