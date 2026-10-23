// Lesson film, "visualized" style: ?id=<example-id>&lang=vi|en. Same plan, timing and voice as
// the hand-drawn film (motion/lessons/film); only the picture differs: a dark diagram with
// gradient-bordered panels, spotlight focus and cards that travel through the event loop.
// window.seek(t) paints frame t as a pure function of time; ?play loops a live preview.
import type { LessonPlan, LessonTiming } from '../lesson-types'
import { createFilmClock } from '../film/film-clock'
import { easeOut, span } from '../film/lib/ease'
import { el, place } from '../film/lib/dom'
import { visLayoutOf } from './vis-layout'
import { carryPicked } from './vis-slots'
import { createSpotlight } from './vis-focus'
import { createVisCodeCard } from './components/vis-code-card'
import { createVisConsoleCard } from './components/vis-console-card'
import { createVisPanels } from './components/vis-panels'
import { createVisCards } from './components/vis-cards'
import { createVisExtras } from './components/vis-extras'
import { createVisIntro } from './components/vis-intro'
import { createVisWhy } from './components/vis-why'
import { createVisRecap } from './components/vis-recap'
import './vis.css'

declare global {
  interface Window {
    seek: (t: number) => void
    __duration: number
    __ready: boolean
  }
}

const params = new URLSearchParams(location.search)
const id = params.get('id') ?? 'sync-promise-async-timeout'
const lang = params.get('lang') ?? 'en'
const base = `/motion/lessons/out/${id}`
const [plan, timing] = (await Promise.all([
  fetch(`${base}/plan.${lang}.json`).then((r) => r.json()),
  fetch(`${base}/timing.${lang}.json`).then((r) => r.json()),
])) as [LessonPlan, LessonTiming]

plan.snapshots = carryPicked(plan.snapshots)
document.documentElement.lang = lang
await Promise.all([
  document.fonts.load("800 60px 'Inter Variable'"),
  document.fonts.load("500 30px 'JetBrains Mono Variable'"),
  document.fonts.load("400 30px 'Inter Variable'", 'ạ'),
])
await document.fonts.ready

const stage = document.getElementById('stage')!
const clock = createFilmClock(plan, timing)
const layout = visLayoutOf(plan)
const spot = createSpotlight(plan, clock)

const divider = el('div', 'v-divider', stage)
const panels = createVisPanels(stage, plan, clock, layout, spot)
const consoleCard = createVisConsoleCard(stage, plan, layout, spot)
const why = createVisWhy(stage, plan, clock, layout)
const code = createVisCodeCard(stage, plan, clock, layout, spot)
const cards = createVisCards(stage, plan, layout, spot)
const extras = createVisExtras(stage, plan, layout, spot)
const intro = createVisIntro(stage, plan, clock, layout)
const recap = createVisRecap(stage, plan, clock)

window.seek = (t: number) => {
  const frame = clock.at(Math.max(0, Math.min(t, clock.duration)))
  const runtime = easeOut(span(frame.t, clock.sceneStart('overview'), clock.sceneStart('overview') + 0.8)) * (1 - easeOut(span(frame.t, clock.sceneStart('recap'), clock.sceneStart('recap') + 0.6)))
  place(divider, layout.divider, 40, runtime * 0.8)
  panels.render(frame)
  consoleCard.render(frame)
  why.render(frame)
  code.render(frame)
  cards.render(frame)
  extras.render(frame)
  intro.render(frame)
  recap.render(frame)
}
window.__duration = clock.duration

if (params.has('play')) {
  const t0 = performance.now() - Number(params.get('t') ?? 0) * 1000
  const loop = (now: number) => {
    window.seek(((now - t0) / 1000) % clock.duration)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
} else {
  window.seek(Number(params.get('t') ?? 0))
}
window.__ready = true
