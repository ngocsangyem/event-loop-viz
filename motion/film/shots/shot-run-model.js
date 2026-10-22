// Pure state model for the run shot: where every chip is at time t, what the caption says, where
// the camera looks. Layout is a 4-lane strip: CALL STACK | MICROTASKS | TASKS | CONSOLE.
import { ease, lerp, clamp01 } from '../lib/time.js'

export const LANE_W = 480
export const LANE_TOP = 300
export const LANE_H = 600
// Stack floor: frames grow up from here. The camera viewport starts at VIEW_TOP (caption above).
export const FLOOR = 880
export const VIEW_TOP = 250
export const HEADER_H = 76
export const CHIP = { w: 452, h: 128, gap: 14 }
export const LANES = [
  { key: 'stack', label: 'call stack', hue: 'var(--stack)' },
  { key: 'job', label: 'microtasks', hue: 'var(--job)' },
  { key: 'task', label: 'tasks', hue: 'var(--task)' },
  { key: 'console', label: 'console', hue: 'var(--console)' },
]

// Slot position in stage pixels. The stack grows up from the floor; queues fill from the top.
export function slotXY(lane, slot) {
  const x = lane * LANE_W + (LANE_W - CHIP.w) / 2
  if (lane === 0) return { x, y: FLOOR - CHIP.h - slot * (CHIP.h + CHIP.gap) }
  return { x, y: LANE_TOP + HEADER_H + 28 + slot * (CHIP.h + CHIP.gap) }
}

// Chips: `path` lists arrivals; each arrival is reached exactly on its beat after `lead` seconds
// of travel. `pop` removes the chip on that beat (a squash, never a fade). `ghost` leaves a dashed
// outline at a queue slot from the beat the chip departs until the given beat.
export const CHIPS = [
  { id: 'task #1', code: '<script>', hue: 'var(--stack)', path: [{ beat: 8, lane: 0, slot: 0, from: 'drop' }], pop: 12, ghost: { lane: 0, slot: 0, from: 12, to: 13 } },
  { id: 'frame', code: "log('start')", hue: 'var(--stack)', path: [{ beat: 8, lane: 0, slot: 1, from: 'drop' }], pop: 8.5 },
  { id: 'frame', code: 'setTimeout(…)', hue: 'var(--stack)', path: [{ beat: 9, lane: 0, slot: 1, from: 'drop' }], pop: 9.5 },
  { id: 'task #2', code: "() => log('timeout')", hue: 'var(--task)', path: [{ beat: 9.5, lane: 0, slot: 1, from: 'spawn' }, { beat: 9.5, lane: 2, slot: 0, lead: 0.3 }, { beat: 16, lane: 0, slot: 0, lead: 0.32 }], pop: 17, ghost: { lane: 2, slot: 0, from: 16, to: 17 } },
  { id: 'frame', code: '.then(…)', hue: 'var(--stack)', path: [{ beat: 10, lane: 0, slot: 1, from: 'drop' }], pop: 10.5 },
  { id: 'job #1', code: "() => log('promise')", hue: 'var(--job)', path: [{ beat: 10.5, lane: 0, slot: 1, from: 'spawn' }, { beat: 10.5, lane: 1, slot: 0, lead: 0.26 }, { beat: 13, lane: 0, slot: 0, lead: 0.3 }], pop: 14, ghost: { lane: 1, slot: 0, from: 13, to: 14 } },
  { id: 'frame', code: "log('end')", hue: 'var(--stack)', path: [{ beat: 11, lane: 0, slot: 1, from: 'drop' }], pop: 11.5 },
]

export const CONSOLE_LINES = [
  { beat: 8.5, text: 'start' },
  { beat: 11.5, text: 'end' },
  { beat: 14, text: 'promise' },
  { beat: 17, text: 'timeout' },
]

// Caption per beat: mono meta row + one line (code is mono, sentences are Inter).
export const CAPTIONS = [
  { beat: 8, meta: 'tick 1 · task #1 · line 1', kind: 'code', html: "console.<b class=c>log</b>('start')" },
  { beat: 9, meta: 'tick 1 · task #1 · line 2', kind: 'code', html: "<b class=tm>setTimeout</b>(() => log('timeout'), <b class=n>0</b>)" },
  { beat: 10, meta: 'tick 1 · task #1 · line 3', kind: 'code', html: "promise.<b class=j>then</b>(() => log('promise'))" },
  { beat: 11, meta: 'tick 1 · task #1 · line 4', kind: 'code', html: "console.<b class=c>log</b>('end')" },
  { beat: 12, meta: 'task #1 done · microtask checkpoint', kind: 'say', html: 'stack empty. drain <b class=j>every microtask</b>' },
  { beat: 13, meta: 'checkpoint · job 1/1', kind: 'say', html: '<b class=j>job #1</b> cuts ahead of <b class=t>task #2</b>' },
  { beat: 14, meta: 'console · log', kind: 'code', html: "<b class=c>promise</b>" },
  { beat: 15, meta: 'tick 2', kind: 'say', html: 'the loop takes <b class=t>one task</b>' },
  { beat: 16, meta: 'tick 2 · task #2', kind: 'say', html: '<b class=t>task #2</b> runs. 0 ms was a minimum' },
  { beat: 17, meta: 'console · log', kind: 'code', html: "<b class=c>timeout</b>" },
]

// Camera keyframes: scale and the stage x at the left edge of the frame, reached on each beat
// after a 0.3 s eased move. Every frame shows whole lanes (never a cropped chip); scale stays
// ≤ 1.25 so lane headers and the stack floor stay inside the viewport.
export const CAMERA = [
  { beat: 8, left: 0, s: 1.0 }, // stack + console
  { beat: 9, left: 0, s: 1.2 }, // stack → tasks
  { beat: 10, left: 0, s: 1.25 }, // stack → microtasks
  { beat: 11, left: 0, s: 1.0 }, // stack + console
  { beat: 12, left: 0, s: 1.25 }, // stack empties
  { beat: 13, left: 0, s: 1.12 }, // microtasks → stack
  { beat: 14, left: 480, s: 1.25 }, // console prints
  { beat: 15, left: 400, s: 1.18 }, // the loop turns
  { beat: 16, left: 0, s: 1.25 }, // tasks → stack (whip left)
  { beat: 17, left: 480, s: 1.25 }, // console prints (whip right)
]

// Phase strip under the lanes: which part of the loop each beat belongs to.
export const PHASES = [
  { from: 8, to: 12, label: 'task #1 · script', hue: 'var(--task)' },
  { from: 12, to: 15, label: 'microtask checkpoint', hue: 'var(--job)' },
  { from: 15, to: 18, label: 'tick 2 · task #2', hue: 'var(--task)' },
]

export function cameraAt(t, clock) {
  let cur = CAMERA[0]
  for (let i = 1; i < CAMERA.length; i++) {
    const k = CAMERA[i]
    const p = clock.land(t, k.beat, 0.3, ease.inOutExpo)
    if (p <= 0) break
    cur = { left: lerp(cur.left, k.left, p), s: lerp(cur.s, k.s, p) }
  }
  return cur
}

// Chip position at t: { x, y, rot, visible, popP, travelling }.
export function chipAt(chip, t, clock) {
  const first = chip.path[0]
  // A dropped frame falls in over 0.16 s; a spawned chip appears when its first trip departs.
  const appear = first.from === 'drop' ? clock.b(first.beat) - 0.16 : clock.b(chip.path[1].beat) - chip.path[1].lead
  if (t < appear) return { visible: false }
  let { x, y } = slotXY(first.lane, first.slot)
  let rot = 0
  let travelling = false
  if (first.from === 'drop') {
    const p = clamp01((t - (clock.b(first.beat) - 0.16)) / 0.16)
    y = lerp(y - 260, y, ease.inQuart(p))
  }
  for (let i = 1; i < chip.path.length; i++) {
    const k = chip.path[i]
    const p = clock.land(t, k.beat, k.lead, ease.inOutExpo)
    if (p <= 0) break
    const to = slotXY(k.lane, k.slot)
    const arc = Math.sin(Math.PI * p) * -140
    rot = Math.sin(Math.PI * p) * Math.sign(to.x - x) * 7
    travelling = p < 1
    x = lerp(x, to.x, p)
    y = lerp(y, to.y, p) + arc
  }
  const popP = chip.pop != null ? clamp01((t - clock.b(chip.pop)) / 0.12) : 0
  return { visible: popP < 1, x, y, rot, popP, travelling }
}
