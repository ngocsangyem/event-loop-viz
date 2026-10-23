// Where each runtime part sits on the 1920×1080 stage for a lesson. Parts a lesson does not use
// are left out and the rest grow into the room, so no panel sits empty for a whole video.
import type { FocusTarget, LessonPlan } from '../lesson-types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Layout {
  code: Rect
  /** Code text metrics: row height and font size, shrunk for long Scripts. */
  codeRow: number
  codeFont: number
  console: Rect
  stack: Rect
  loop: Rect
  webApis?: Rect
  microtasks?: Rect
  tasks?: Rect
  caption: Rect
}

export const STAGE = { w: 1920, h: 1080, margin: 56, gap: 28 }
const PANEL_HEAD = 60
const RIGHT_X = 952
const RIGHT_W = 1864 - RIGHT_X
const BOTTOM = 908

export function layoutOf(plan: LessonPlan): Layout {
  const { margin, gap } = STAGE
  const leftW = RIGHT_X - margin - 36
  // Code gets what it needs up to 62% of the left column; the console keeps at least 230 px.
  const maxCode = BOTTOM - margin - gap - 230
  const codeRow = Math.max(30, Math.min(44, Math.floor((maxCode - PANEL_HEAD - 24) / plan.code.length)))
  // JetBrains Mono advances 0.6 em; the type shrinks (not below 19 px) until the longest row fits.
  const longest = Math.max(...plan.code.map((row) => row.text.length))
  const codeFont = Math.max(19, Math.min(Math.round(codeRow * 0.6), Math.floor((leftW - 64 - 34) / (longest * 0.6))))
  const codeH = PANEL_HEAD + 24 + codeRow * plan.code.length
  const code = { x: margin, y: margin, w: leftW, h: codeH }
  const consoleRect = { x: margin, y: code.y + codeH + gap, w: leftW, h: BOTTOM - (code.y + codeH + gap) }

  // Right column: queues are full-width rows at the bottom; stack and loop (+ Web APIs) share the top.
  const queues = (['microtasks', 'tasks'] as const).filter((q) => plan.panels.includes(q))
  const queueH = 140
  const topH = BOTTOM - margin - queues.length * (queueH + gap)
  const stack = { x: RIGHT_X, y: margin, w: 340, h: topH }
  const sideX = RIGHT_X + 340 + gap
  const sideW = RIGHT_X + RIGHT_W - sideX
  const hasWeb = plan.panels.includes('webApis')
  const loopH = hasWeb ? Math.min(250, Math.round(topH * 0.46)) : topH
  const loop = { x: sideX, y: margin, w: sideW, h: loopH }
  const layout: Layout = {
    code,
    codeRow,
    codeFont,
    console: consoleRect,
    stack,
    loop,
    caption: { x: margin, y: 944, w: STAGE.w - margin * 2, h: 100 },
  }
  if (hasWeb) layout.webApis = { x: sideX, y: margin + loopH + gap, w: sideW, h: topH - loopH - gap }
  let y = margin + topH + gap
  for (const q of queues) {
    layout[q] = { x: RIGHT_X, y, w: RIGHT_W, h: queueH }
    y += queueH + gap
  }
  return layout
}

export function rectOf(layout: Layout, target: FocusTarget): Rect | undefined {
  return target === 'code' ? layout.code : target === 'console' ? layout.console : layout[target]
}

/** Inside the event loop panel: the ring on the left, phase and clock on the right, the picked callback under them. */
export function loopGeometry(layout: Layout) {
  const r = layout.loop
  const radius = Math.max(46, Math.min(74, (r.h - 100) / 2))
  const cx = r.x + radius + 66
  const cy = r.y + 66 + (r.h - 66) / 2 - 4
  const textX = cx + radius + 96
  const textW = r.x + r.w - textX - 22
  return { radius, cx, cy, textX, textW, picked: { x: textX, y: r.y + r.h - 66 - 18, w: textW, h: 66 } }
}
