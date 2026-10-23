// Stage layout of the "visualized" lesson style: the Script and its console on the left, a dashed
// divider, then the runtime laid out like a diagram: Call Stack and Web APIs on top, a narrow
// Event Loop column with the two queues beside it underneath. Parts a lesson leaves out give
// their room to the others.
import type { FocusTarget, LessonPlan } from '../lesson-types'
import type { Rect } from '../film/layout'

export type { Rect }

export interface VisLayout {
  code: Rect
  codeRow: number
  codeFont: number
  console: Rect
  divider: number
  stack: Rect
  loop: Rect
  webApis?: Rect
  tasks?: Rect
  microtasks?: Rect
}

const M = 56
const LEFT_W = 800
const RIGHT_X = 904
const RIGHT_W = 1864 - RIGHT_X
const GAP = 28
const BOTTOM = 1024
const CODE_HEAD = 64

export function visLayoutOf(plan: LessonPlan): VisLayout {
  const longest = Math.max(...plan.code.map((row) => row.text.length))
  // JetBrains Mono advances 0.6 em: the type shrinks (19–24 px) until the longest row fits.
  const codeFont = Math.max(17, Math.min(24, Math.floor((LEFT_W - 112) / (longest * 0.6))))
  const codeRow = Math.max(28, Math.min(40, Math.round(codeFont * 1.7), Math.floor(420 / plan.code.length)))
  const codeH = CODE_HEAD + 20 + codeRow * plan.code.length
  const code = { x: M, y: M, w: LEFT_W, h: codeH }
  const consoleY = code.y + codeH + 32
  const layout: VisLayout = {
    code,
    codeRow,
    codeFont,
    console: { x: M, y: consoleY, w: LEFT_W, h: BOTTOM - consoleY },
    divider: M + LEFT_W + (RIGHT_X - M - LEFT_W) / 2,
    stack: { x: RIGHT_X, y: M, w: RIGHT_W, h: 500 },
    loop: { x: RIGHT_X, y: M + 500 + 40, w: 170, h: BOTTOM - (M + 500 + 40) },
  }
  if (plan.panels.includes('webApis')) {
    layout.stack.w = 380
    layout.webApis = { x: RIGHT_X + 380 + GAP, y: M, w: RIGHT_W - 380 - GAP, h: 500 }
  }
  const queues = (['tasks', 'microtasks'] as const).filter((q) => plan.panels.includes(q))
  // No queue in this lesson: the Event Loop takes the whole bottom row.
  if (queues.length === 0) layout.loop.w = RIGHT_W
  const qx = layout.loop.x + layout.loop.w + GAP
  const qGap = 36
  const qh = queues.length ? (layout.loop.h - (queues.length - 1) * qGap) / queues.length : 0
  queues.forEach((q, i) => {
    layout[q] = { x: qx, y: layout.loop.y + i * (qh + qGap), w: 1864 - qx, h: qh }
  })
  return layout
}

export function visRectOf(layout: VisLayout, target: FocusTarget): Rect | undefined {
  return layout[target]
}

/** Where a callback waits once the event loop has taken it: over the loop column, on its way to the stack. */
export function pickedRect(layout: VisLayout): Rect {
  const r = layout.loop
  const w = 260
  return { x: r.x + r.w / 2 - w / 2, y: r.y + 70, w, h: 60 }
}
