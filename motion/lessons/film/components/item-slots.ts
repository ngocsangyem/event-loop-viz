// Where every item of a snapshot sits on stage. An item keeps its id as it moves between places
// (Web APIs → Task Queue → event loop → Call Stack), which is what lets the film fly it.
import type { LessonPlan, LessonSnapshot, QueueItem, StackItem, WebApiItem } from '../../lesson-types'
import { loopGeometry } from '../layout'
import type { Layout, Rect } from '../layout'

export type Place = 'stack' | 'webApis' | 'microtasks' | 'tasks' | 'picked'

export interface Slot extends Rect {
  id: string
  place: Place
  /** What the card says. */
  kind: string
  code: string
  /** Top of the call stack: the code running now. */
  top: boolean
}

export const CARD_H = 66
const GAP = 12
const PAD = 22
const HEAD = 66

export function parkedHeight(snapshot: LessonSnapshot): number {
  return snapshot.parked.length ? 18 + snapshot.parked.length * 46 : 0
}

function stackSlots(items: StackItem[], rect: Rect, snapshot: LessonSnapshot, labels: Record<string, string>): Slot[] {
  const floor = rect.y + rect.h - PAD - parkedHeight(snapshot)
  const room = rect.h - HEAD - PAD - parkedHeight(snapshot)
  const step = Math.min(CARD_H + GAP, room / Math.max(1, items.length))
  const h = Math.min(CARD_H, step - 6)
  return items.map((item, i) => ({
    id: item.id,
    place: 'stack' as const,
    x: rect.x + PAD,
    y: floor - (i + 1) * step + (step - h),
    w: rect.w - PAD * 2,
    h,
    kind: item.kind === 'builtin' ? labels.builtin ?? '' : item.kind === 'script' ? '' : item.kind === 'callback' ? labels.callback ?? '' : '',
    code: item.label,
    top: i === items.length - 1,
  }))
}

function rowSlots(items: QueueItem[], rect: Rect, place: Place): Slot[] {
  const room = rect.w - PAD * 2
  const w = Math.max(150, Math.min(400, (room - (items.length - 1) * GAP) / Math.max(1, items.length)))
  return items.map((item, i) => ({
    id: item.id,
    place,
    x: rect.x + PAD + i * (w + GAP),
    y: rect.y + HEAD,
    w,
    h: CARD_H,
    kind: item.kind,
    code: item.code,
    top: false,
  }))
}

function columnSlots(items: WebApiItem[], rect: Rect): Slot[] {
  const step = Math.min(CARD_H + GAP, (rect.h - HEAD - PAD) / Math.max(1, items.length))
  return items.map((item, i) => ({
    id: item.id,
    place: 'webApis' as const,
    x: rect.x + PAD,
    y: rect.y + HEAD + i * step,
    w: rect.w - PAD * 2,
    h: Math.min(CARD_H, step - 6),
    kind: `${item.kind} · ${item.detail}`,
    code: item.code,
    top: false,
  }))
}

/** The slot a callback waits in once the event loop has taken it and before its frame is pushed. */
export function pickedRect(layout: Layout): Rect {
  return loopGeometry(layout).picked
}

export function slotsOf(snapshot: LessonSnapshot, layout: Layout, plan: LessonPlan): Map<string, Slot> {
  const slots = new Map<string, Slot>()
  const add = (list: Slot[]) => list.forEach((s) => slots.set(s.id, s))
  add(stackSlots(snapshot.stack, layout.stack, snapshot, plan.labels))
  if (layout.webApis) add(columnSlots(snapshot.webApis, layout.webApis))
  if (layout.microtasks) add(rowSlots(snapshot.jobs, layout.microtasks, 'microtasks'))
  if (layout.tasks) add(rowSlots(snapshot.tasks, layout.tasks, 'tasks'))
  if (snapshot.picked) {
    const r = pickedRect(layout)
    slots.set(snapshot.picked.id, { ...r, id: snapshot.picked.id, place: 'picked', kind: snapshot.picked.kind, code: snapshot.picked.code, top: false })
  }
  return slots
}

/** Concept hue name of a place, for the card's colour. */
export const CONCEPT: Record<Place, string> = {
  stack: 'stack',
  webApis: 'webapi',
  microtasks: 'job',
  tasks: 'task',
  picked: 'accent',
}
