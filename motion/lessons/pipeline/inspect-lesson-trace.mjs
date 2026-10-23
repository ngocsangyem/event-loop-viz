// Prints what a lesson author needs to anchor steps on an example's Trace: every visible event
// that changes what the video shows, with the view after it. Use it to write `at` matchers.
//   node motion/lessons/pipeline/inspect-lesson-trace.mjs <example-id> [vi|en]
import { openAppModules } from './load-app-modules.mjs'

const [id, lang = 'en'] = process.argv.slice(2)
if (!id) throw new Error('usage: inspect-lesson-trace.mjs <example-id> [vi|en]')

const app = await openAppModules()
try {
  const { findExample } = await app.load('/src/examples/example-library.ts')
  const { runScript } = await app.load('/src/runner/run-script.ts')
  const { createPlayer } = await app.load('/src/player/player.ts')
  const snap = await app.load('/motion/lessons/timeline/snapshot-of-state.ts')
  const labels = await app.load('/motion/lessons/timeline/lesson-labels.ts')
  const example = findExample(id)
  if (!example) throw new Error(`no example ${id}`)
  const run = await runScript(example.script)
  if (run.kind !== 'ran') throw new Error(`${id}: ${run.kind}`)
  const { trace } = run
  const player = createPlayer(trace)
  const ctx = {
    trace,
    sourceLines: trace.header.source.split('\n'),
    chipLabels: labels.chipLabelsFor(lang),
    words: { script: 'Script', anonymous: '(anonymous)', resumed: (fn) => `${fn} resumes` },
    frameLines: snap.frameLinesOf(trace),
    picked: snap.pickedIdsOf(trace),
  }
  // The video hides the `// Concept:` header and oracle directives and numbers the rest from 1:
  // narration must say the display number (left), not the Trace line (L<n> below).
  const { codeRowsOf } = await app.load('/motion/lessons/timeline/code-rows.ts')
  const { displayLine } = codeRowsOf(example.script)
  console.log('display | trace line')
  console.log(example.script.split('\n').map((l, i) => `${String(displayLine.get(i + 1) ?? '-').padStart(4)} | L${String(i + 1).padEnd(3)} ${l}`).join('\n'))
  console.log('\nOUTPUT', JSON.stringify(run.observableOutput.map((e) => e.text ?? `${e.kind}: ${e.message}`)))
  let last = null
  for (const position of player.stepPositions()) {
    const event = trace.events[position]
    const view = snap.snapshotOf(player.stateAt(position), ctx)
    if (last && snap.sameView(view, last)) continue
    last = view
    const { seq, t: _t, ref: _ref, visible: _visible, loc, cause: _cause, callback: _callback, ...rest } = event
    const parts = [
      `stack=[${view.stack.map((s) => s.label).join(' > ')}]`,
      view.picked && `picked=${view.picked.code || view.picked.kind}`,
      view.webApis.length && `web=[${view.webApis.map((w) => `${w.kind}:${w.code}`).join(', ')}]`,
      view.jobs.length && `micro=[${view.jobs.map((j) => j.code || j.kind).join(', ')}]`,
      view.tasks.length && `tasks=[${view.tasks.map((j) => j.code || j.kind).join(', ')}]`,
      view.parked.length && `parked=[${view.parked.join(', ')}]`,
      `phase=${view.phase}`,
      `clock=${view.clockMs}ms`,
      view.console.length && `console=${view.console.length}:${view.console[view.console.length - 1].text}`,
    ].filter(Boolean)
    const shown = loc ? `L${loc.line} (display line ${displayLine.get(loc.line) ?? '-'})` : 'L-'
    console.log(`\n#${seq} ${shown} ${JSON.stringify(rest)}\n    ${parts.join('  ')}`)
  }
} finally {
  await app.close()
}
