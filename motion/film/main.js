// Film entry. Builds every shot once, then window.seek(t) paints frame t as a pure function of time.
// Render mode (default) never schedules work; ?play adds a requestAnimationFrame preview loop and
// ?t=<seconds> parks the preview on one frame.
import { createClock } from './lib/time.js'
import { SECTIONS, DURATION } from './cues.js'
import { createHookShot } from './shots/shot-hook.js'
import { createLoopShot } from './shots/shot-loop.js'
import { createRunShot } from './shots/shot-run.js'
import { createReorderShot } from './shots/shot-reorder.js'
import { createRuleShot } from './shots/shot-rule.js'
import { createLogoShot } from './shots/shot-logo.js'

const grid = window.__BEATS ?? (await (await fetch('../beats.json')).json())
const clock = createClock(grid)
const stage = document.getElementById('stage')

await document.fonts.load("800 100px 'Inter'")
await document.fonts.load("500 100px 'JetBrains Mono'")
await document.fonts.ready

const shots = [
  createHookShot(stage, clock),
  createLoopShot(stage, clock),
  createRunShot(stage, clock),
  createReorderShot(stage, clock),
  createRuleShot(stage, clock),
  createLogoShot(stage, clock),
]
// Some shots measure laid-out text once (e.g. where the "0" glyph sits) after fonts load.
for (const s of shots) s.measure?.()

window.seek = (t) => {
  for (const s of shots) {
    const [a, b] = SECTIONS[s.name]
    const on = t >= clock.b(a) - 1e-6 && (t < clock.b(b) - 1e-6 || (b === 32 && t <= DURATION))
    s.el.style.display = on ? '' : 'none'
    if (on) s.render(t)
  }
}
window.__duration = DURATION

const params = new URLSearchParams(location.search)
if (params.has('play')) {
  const t0 = performance.now()
  const loop = (now) => {
    window.seek(((now - t0) / 1000) % DURATION)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
} else {
  window.seek(Number(params.get('t') ?? 0))
}
window.__ready = true
