// Lesson film entry: ?id=<example-id>&lang=vi|en. Loads the plan and its measured timing, builds
// every part once, then window.seek(t) paints frame t as a pure function of time (no transitions,
// timers or animation frames in render mode). ?play adds a live preview loop; ?t= parks on a frame.
import type { LessonPlan, LessonTiming } from '../lesson-types'
import { createFilmClock } from './film-clock'
import { layoutOf } from './layout'
import { svgLayer } from './lib/dom'
import { createCodePanel } from './components/code-panel'
import { createPanelFrame, runtimeDim } from './components/panel-frame'
import type { PanelFrame } from './components/panel-frame'
import { createItemLayer } from './components/item-layer'
import { createConsoleView } from './components/console-view'
import { createEventLoopView } from './components/event-loop-view'
import { createPanelExtras } from './components/panel-extras'
import { createIntroView } from './components/intro-view'
import { createAnnotationView } from './components/annotation-view'
import { createCaptionView } from './components/caption-view'
import { createWhyView } from './components/why-view'
import { createRecapView } from './components/recap-view'
import './film.css'

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

document.documentElement.lang = lang
await Promise.all([
  document.fonts.load("500 30px 'Inter Variable'"),
  document.fonts.load("500 30px 'JetBrains Mono Variable'"),
  document.fonts.load("400 30px 'Pangolin'", 'ạ'),
  document.fonts.load("400 30px 'Inter Variable'", 'ạ'),
])
await document.fonts.ready

const stage = document.getElementById('stage')!
const clock = createFilmClock(plan, timing)
const layout = layoutOf(plan)
const back = svgLayer(stage, 'strokes strokes-back')
const code = createCodePanel(stage, back, plan, clock, layout)

const frames: Record<string, PanelFrame> = {
  stack: createPanelFrame(stage, back, plan, clock, 'stack', layout.stack, plan.labels.callStack!, 'stack'),
  loop: createPanelFrame(stage, back, plan, clock, 'loop', layout.loop, plan.labels.loop!, 'loop'),
  console: createPanelFrame(stage, back, plan, clock, 'console', layout.console, plan.labels.console!, 'console'),
}
if (layout.webApis) frames.webApis = createPanelFrame(stage, back, plan, clock, 'webApis', layout.webApis, plan.labels.webApis!, 'webapi')
if (layout.microtasks) frames.microtasks = createPanelFrame(stage, back, plan, clock, 'microtasks', layout.microtasks, plan.labels.microtasks!, 'job')
if (layout.tasks) frames.tasks = createPanelFrame(stage, back, plan, clock, 'tasks', layout.tasks, plan.labels.tasks!, 'task')

const consoleView = createConsoleView(frames.console!.body, plan, layout)
const loopView = createEventLoopView(stage, back, plan, layout)
const extras = createPanelExtras(stage, back, plan, layout)
const front = svgLayer(stage, 'strokes strokes-front')
const items = createItemLayer(stage, front, plan, clock, layout)
const why = createWhyView(stage, front, plan, clock, layout)
const intro = createIntroView(stage, front, plan, clock, layout)
const annotation = createAnnotationView(stage, front, plan, layout)
const recap = createRecapView(stage, front, plan, clock)
const caption = createCaptionView(stage, plan, layout)

window.seek = (t: number) => {
  const frame = clock.at(Math.max(0, Math.min(t, clock.duration)))
  const dim = runtimeDim(frame, clock)
  code.render(frame)
  for (const panel of Object.values(frames)) panel.render(frame)
  consoleView.render(frame)
  loopView.render(frame, frames.loop!.presence(frame), dim)
  extras.render(frame, (key) => frames[key]?.presence(frame) ?? 0, dim)
  items.render(frame)
  why.render(frame)
  intro.render(frame)
  annotation.render(frame)
  recap.render(frame)
  caption.render(frame)
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
