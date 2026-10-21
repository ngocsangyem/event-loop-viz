// Writes the claude.ai/design upload layout (`ds-bundle/`) for the custom-element design system.
// Inputs: design-system/dist/elv.js (run the vite build first), docs/design/tokens.css, and one
// authored folder per component under design-system/docs/<Name>/ holding <Name>.d.ts,
// <Name>.prompt.md and <Name>.preview.html (story cells: <section data-story="Name">…</section>).
// No React anywhere: cards load the IIFE, which registers every <elv-*> tag.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DS = join(ROOT, 'design-system')
const OUT = join(ROOT, 'ds-bundle')
const GLOBAL = 'ELV'
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'

const bundle = join(DS, 'dist/elv.js')
if (!existsSync(bundle)) {
  console.error('[NO_DIST] design-system/dist/elv.js missing: run the design-system vite build first')
  process.exit(1)
}

/** Component docs, each folder's meta.json naming its tag and card group. */
const docsDir = join(DS, 'docs')
const components = readdirSync(docsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const meta = JSON.parse(readFileSync(join(docsDir, d.name, 'meta.json'), 'utf8'))
    return { name: d.name, dir: join(docsDir, d.name), ...meta }
  })

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'tokens'), { recursive: true })

const sha12 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12)
const write = (rel, data) => {
  mkdirSync(dirname(join(OUT, rel)), { recursive: true })
  writeFileSync(join(OUT, rel), data)
}

// Tokens + fonts: designs receive only styles.css's @import closure.
copyFileSync(join(ROOT, 'docs/design/tokens.css'), join(OUT, 'tokens/tokens.css'))
write('styles.css', `@import url("${FONTS_URL}");\n@import "./tokens/tokens.css";\n`)

/**
 * A preview card: first line is the @dsCard marker; ?story=<Name> renders one cell full-bleed.
 * Each authored `<section data-story="Name">…</section>` becomes a labeled `.ds-cell` whose body
 * mounts in `#r<i>` (the ids the render check measures). `cardMode: "column"` in meta.json gives
 * wide elements one full-width story per row.
 */
function card(c, body) {
  const cells = [...body.matchAll(/<section data-story="([^"]+)"([^>]*)>([\s\S]*?)<\/section>/g)]
  if (!cells.length) throw new Error(`${c.name}.preview.html has no <section data-story> cells`)
  const html = cells
    // Extra attributes on an authored section (e.g. a max-width style) move onto its mount root.
    .map(([, story, attrs, inner], i) => `    <section class="ds-cell" data-story="${story}"><h4>${story}</h4><div id="r${i}"${attrs}>${inner}</div></section>`)
    .join('\n')
  const column = c.cardMode === 'column'
  return `<!-- @dsCard group="${c.group}" -->
<!doctype html>
<html data-theme="dark"><head><meta charset="utf-8">
  <link rel="stylesheet" href="../../../styles.css">
  <style>
    body{margin:0;padding:24px;background:var(--color-bg);color:var(--color-ink);font-family:var(--font-sans)}
    .ds-grid{display:grid;grid-template-columns:${column ? '1fr' : 'repeat(auto-fill,minmax(300px,1fr))'};gap:20px;align-items:start}
    .ds-cell{border:1px solid var(--color-line-soft);padding:12px;min-width:0;overflow:hidden}
    .ds-cell>h4{margin:0 0 8px;font:500 11.5px var(--font-mono);color:var(--color-ink-3);text-transform:uppercase;letter-spacing:.02em}
    body.ds-single{padding:16px}
    body.ds-single .ds-cell{border:0;padding:0}
  </style>
  <script src="../../../_ds_bundle.js"></script>
</head><body>
  <div class="ds-grid">
${html}
  </div>
  <script>
    window.__dsMode=${JSON.stringify(column ? 'column' : 'grid')};
    var cells=[].slice.call(document.querySelectorAll('.ds-cell'));
    window.__dsCells=cells.map(function(s){return s.dataset.story});
    var q=null;try{q=new URLSearchParams(location.search).get('story')}catch(e){}
    if(q){document.body.className='ds-single';cells.forEach(function(s){if(s.dataset.story.toLowerCase()!==q.toLowerCase())s.remove();else s.querySelector('h4').remove()})}
  </script>
</body></html>
`
}

const out = []
for (const c of components) {
  const base = `components/${c.group}/${c.name}/${c.name}`
  for (const ext of ['.d.ts', '.prompt.md']) write(base + ext, readFileSync(join(c.dir, c.name + ext)))
  // The component's source entry for the self-check: a plain JS module naming its tag (no React).
  write(`${base}.js`, `// <${c.tag}> is registered by _ds_bundle.js; use the tag in markup.\nexport const tag = '${c.tag}'\nexport default window.${GLOBAL}.${c.name}\n`)
  write(base + '.html', card(c, readFileSync(join(c.dir, c.name + '.preview.html'), 'utf8')))
  out.push(c)
}

// _ds_bundle.js with the first-line header the app's self-check parses.
const sourceHashes = Object.fromEntries(
  out.flatMap((c) =>
    ['.js', '.d.ts', '.prompt.md'].map((ext) => {
      const rel = `components/${c.group}/${c.name}/${c.name}${ext}`
      return [rel, sha12(readFileSync(join(OUT, rel)))]
    }),
  ),
)
const header = {
  namespace: GLOBAL,
  components: out.map((c) => ({ name: c.name, sourcePath: `components/${c.group}/${c.name}/${c.name}.js` })),
  sourceHashes,
  inlinedExternals: ['vue'],
  builtBy: 'cc-design-sync',
}
write('_ds_bundle.js', `/* @ds-bundle: ${JSON.stringify(header).replace(/\*\//g, '*\\/')} */\n` + readFileSync(bundle, 'utf8'))
write('_ds_needs_recompile', JSON.stringify({ by: 'design-sync-cli' }))
const readmeHeader = join(ROOT, '.design-sync/conventions.md')
write(
  'README.md',
  (existsSync(readmeHeader) ? readFileSync(readmeHeader, 'utf8') + '\n\n' : '') +
    `# Components\n\n` +
    out.map((c) => `- \`<${c.tag}>\` (${c.name}, ${c.group}): ${readFileSync(join(c.dir, c.name + '.prompt.md'), 'utf8').split('\n')[0]}`).join('\n') +
    '\n',
)
// Local-only build metadata (dot-prefixed, never uploaded) the validator reads for counts.
write('.ds-build-meta.json', JSON.stringify({ shape: 'custom-elements', componentCount: out.length }))
console.log(`ds-bundle: ${out.length} components → ${OUT}`)
