import type { JobKind, CallbackInfo, WebApiKind } from '../../trace/trace-event'
import type { QueuedTask, ReplayState } from '../../player/replay-state'
import { visibleFrames } from './panel-view-model'
import { webApiCardsOf, webOpCardsOf } from './web-api-card-model'

/** Longest chip text in the DOM; the CSS ellipsis then fits it to any width. */
export const MAX_CHIP_CHARS = 120
/** Longest tooltip / accessible name, so a huge function cannot bloat the DOM. */
const MAX_FULL_CHARS = 500

/** Where a callback sits right now. A chip id is in exactly one place at any position. */
export type ChipPlace = 'webapis' | 'taskq' | 'microq' | 'taskq-running' | 'microq-running' | 'stack'

export interface ChipModel {
  id: string
  /** What the pill shows: one line, at most MAX_CHIP_CHARS characters. */
  text: string
  /** Complete text for the tooltip and the accessible name. */
  full: string
  /** What the callback is ("Timer", "Promise reaction"...); the tooltip names it. */
  kind: string
  place: ChipPlace
  /** Source line the callback starts at, for the row's `L<line>` marker. */
  line?: number
}

export interface ChipTextLabels {
  awaitResume: (fn: string) => string
  anonymous: string
  line: (line: number) => string
}

export interface ChipLabels extends ChipTextLabels {
  taskSource: (source: QueuedTask['source']) => string
  jobKind: (kind: JobKind) => string
  webApi: (api: WebApiKind) => string
}

type Translate = (key: string, params?: Record<string, unknown>) => string

/** The strings a chip needs, from vue-i18n's `t`. */
export function chipLabelsOf(t: Translate): ChipLabels {
  return {
    awaitResume: (fn) => t('panels.chip.awaitResume', { fn }),
    anonymous: t('panels.chip.anonymous'),
    line: (line) => t('panels.chip.line', { line }),
    taskSource: (source) => t(`panels.taskSource.${source}`),
    jobKind: (kind) => t(`panels.jobKind.${kind}`),
    webApi: (api) => t(`panels.webApis.op.${api}`),
  }
}

const CONSOLE_METHODS = new Set(['log', 'info', 'warn', 'error'])

/** `log` is `console.log` here: the only supported API with those names. Other built-ins keep their bare name. */
export const builtinLabel = (name: string): string => (CONSOLE_METHODS.has(name) ? `console.${name}` : name)

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim()
const cut = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** The text of a callback, or null when the Trace gave nothing to show. */
export function chipText(
  info: CallbackInfo,
  source: string,
  labels: ChipTextLabels,
): { text: string; full: string } | null {
  if (info.kind === 'builtin') {
    if (!info.name) return null
    const name = builtinLabel(info.name)
    return { text: cut(name, MAX_CHIP_CHARS), full: name }
  }
  if (info.kind === 'await') {
    const text = labels.awaitResume(info.name || labels.anonymous)
    return { text: cut(text, MAX_CHIP_CHARS), full: info.loc ? `${text} (${labels.line(info.loc.line)})` : text }
  }
  if (!info.loc) return null
  // Cut a bounded window first: collapsing a huge function would cost its whole length per render.
  const code = collapse(source.slice(info.loc.start, Math.min(info.loc.end, info.loc.start + MAX_FULL_CHARS * 4)))
  if (!code) return null
  return { text: cut(code, MAX_CHIP_CHARS), full: cut(code, MAX_FULL_CHARS) }
}

/**
 * Every callback chip the panels may draw for one state, by chip id. The chip of a running
 * callback is on its running row until its stack frame exists, then on that frame, then gone.
 */
export function chipsOf(state: ReplayState, source: string, labels: ChipLabels): Map<string, ChipModel> {
  const chips = new Map<string, ChipModel>()
  const add = (id: string, info: CallbackInfo | undefined, kind: string, place: ChipPlace) => {
    const text = info && chipText(info, source, labels)
    if (text) chips.set(id, { id, ...text, kind, place, ...(info.loc && { line: info.loc.line }) })
  }
  // Only timers with a card on screen have a chip: the rest are summarised, and a chip nobody
  // can see must not count as a traveller.
  for (const card of webApiCardsOf(state).cards) {
    if (card.taskId !== undefined) add(card.taskId, card.callback, labels.taskSource('timer'), 'webapis')
  }
  for (const card of webOpCardsOf(state).cards) {
    if (card.taskId !== undefined) add(card.taskId, card.callback, labels.webApi(card.api), 'webapis')
  }
  for (const task of state.tasks) add(task.taskId, task.callback, labels.taskSource(task.source), 'taskq')
  for (const job of state.jobs) add(job.jobId, job.callback, labels.jobKind(job.jobKind), 'microq')

  const running = state.runningCallback
  if (running && !running.done) {
    const onStack =
      running.frameId !== null && visibleFrames(state).some((frame) => frame.frameId === running.frameId)
    const kind =
      running.owner === 'task' && state.currentTaskSource
        ? labels.taskSource(state.currentTaskSource)
        : state.currentJobKind
          ? labels.jobKind(state.currentJobKind)
          : ''
    add(running.chipId, running.callback, kind, onStack ? 'stack' : running.owner === 'task' ? 'taskq-running' : 'microq-running')
  }
  return chips
}

/** `{ chip }` for a row whose chip sits in `place`, or nothing, so the row keeps its label. */
export function chipOf(chips: Map<string, ChipModel>, id: string, place: ChipPlace): { chip?: ChipModel } {
  const chip = chips.get(id)
  return chip && chip.place === place ? { chip } : {}
}
