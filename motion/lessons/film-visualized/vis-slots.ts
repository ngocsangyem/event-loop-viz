// Where every item of a snapshot sits in the visualized layout. Items keep their ids as they move
// (Web APIs → Task Queue → event loop → Call Stack), which is what lets the film fly them.
import type { LessonSnapshot, QueueItem, StackItem, WebApiItem } from '../lesson-types'
import { pickedRect } from './vis-layout'
import type { Rect, VisLayout } from './vis-layout'

export type Place = 'stack' | 'webApis' | 'tasks' | 'microtasks' | 'picked'

export interface Slot extends Rect {
  id: string
  place: Place
  /** Small tag on the card's top edge ("Timer", "Promise reaction"); empty for stack frames. */
  tag: string
  code: string
  /** Web API cards: the API name and the value it holds (a delay, a URL…). */
  api?: string
  value?: { label: string; text: string; number: boolean }
}

const PAD = 22
export const FRAME_H = 58
const QUEUE_CARD_H = 64
/** Queue cards are sized to their code: JetBrains Mono at 17 px advances 10.2 px. */
const QUEUE_CHAR = 10.2

function stackSlots(items: StackItem[], rect: Rect): Slot[] {
  const step = Math.min(FRAME_H + 10, (rect.h - 110) / Math.max(1, items.length))
  const h = Math.min(FRAME_H, step - 6)
  const floor = rect.y + rect.h - PAD
  return items.map((item, i) => ({ id: item.id, place: 'stack' as const, x: rect.x + PAD, y: floor - (i + 1) * step + (step - h), w: rect.w - PAD * 2, h, tag: '', code: item.label }))
}

function queueSlots(items: QueueItem[], rect: Rect, place: Place): Slot[] {
  const room = rect.w - PAD * 2
  const natural = items.map((item) => Math.max(200, item.code.length * QUEUE_CHAR + 44))
  const total = natural.reduce((a, b) => a + b, 0) + Math.max(0, items.length - 1) * 14
  const k = total > room ? (room - (items.length - 1) * 14) / (total - (items.length - 1) * 14) : 1
  let x = rect.x + PAD
  const y = rect.y + (rect.h - QUEUE_CARD_H) / 2 + 10
  return items.map((item, i) => {
    const w = natural[i]! * k
    const slot = { id: item.id, place, x, y, w, h: QUEUE_CARD_H, tag: item.kind, code: item.code }
    x += w + 14
    return slot
  })
}

/** "0 ms" → a delay slot; anything else is shown as it is. */
function valueOf(detail: string, delayLabel: string) {
  const ms = /^(\d+(?:\.\d+)?)\s*ms\b/.exec(detail)
  return ms ? { label: delayLabel, text: ms[1]!, number: true } : detail ? { label: 'info', text: detail, number: false } : undefined
}

function webApiSlots(items: WebApiItem[], rect: Rect): Slot[] {
  const gap = 22
  const h = Math.min(156, (rect.h - 80 - (items.length - 1) * gap) / Math.max(1, items.length))
  return items.map((item, i) => ({
    id: item.id,
    place: 'webApis' as const,
    x: rect.x + PAD,
    y: rect.y + 64 + i * (h + gap),
    w: rect.w - PAD * 2,
    h,
    tag: item.kind,
    code: item.code,
    api: item.kind,
    value: valueOf(item.detail, 'delay'),
  }))
}

/**
 * Between "the loop takes a callback" and "its frame is pushed" the Trace has a few steps with
 * neither, which would make the card vanish for a beat. Keep it on the loop until it is pushed.
 */
export function carryPicked(snapshots: LessonSnapshot[]): LessonSnapshot[] {
  let held: LessonSnapshot['picked'] = null
  return snapshots.map((s) => {
    if (s.picked) held = s.picked
    else if (held && s.stack.length === 0 && s.phase !== 'idle' && s.phase !== 'halted') return { ...s, picked: held }
    else held = null
    return s
  })
}

export function visSlotsOf(snapshot: LessonSnapshot, layout: VisLayout): Map<string, Slot> {
  const slots = new Map<string, Slot>()
  const add = (list: Slot[]) => list.forEach((s) => slots.set(s.id, s))
  add(stackSlots(snapshot.stack, layout.stack))
  if (layout.webApis) add(webApiSlots(snapshot.webApis, layout.webApis))
  if (layout.tasks) add(queueSlots(snapshot.tasks, layout.tasks, 'tasks'))
  if (layout.microtasks) add(queueSlots(snapshot.jobs, layout.microtasks, 'microtasks'))
  if (snapshot.picked) {
    const p = snapshot.picked
    slots.set(p.id, { ...pickedRect(layout), id: p.id, place: 'picked', tag: p.code ? p.kind : '', code: p.code || p.kind })
  }
  return slots
}
