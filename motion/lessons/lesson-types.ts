// Shared shapes of the lesson video system. Three layers meet here:
//   LessonContent (hand-written teaching, both languages) + the Trace (real engine run)
//   → LessonPlan (one language, every visual state precomputed)
//   → LessonTiming (measured voice-over durations) → frames.
// The film reads only LessonPlan + LessonTiming, so it stays a pure function of time.

import type { EventMatcher } from '../../src/renderer/drive/drive-step'

export const LANGS = ['vi', 'en'] as const
export type Lang = (typeof LANGS)[number]
export type Bilingual = Record<Lang, string>

/** Runtime parts a lesson may leave out. The code, call stack, event loop and console always show. */
export type OptionalPanel = 'webApis' | 'tasks' | 'microtasks'
export type FocusTarget = 'code' | 'stack' | 'webApis' | 'tasks' | 'microtasks' | 'loop' | 'console'
export type SceneId = 'intro' | 'overview' | 'execute' | 'why' | 'recap'

/** One narrated line outside the execution scene. */
export interface ContentLine {
  say: Bilingual
  focus?: FocusTarget
  /** Silence after the line, seconds. Longer after a new idea. */
  pause?: number
}

/** One narrated execution step: it stands on a Trace event; every move up to that event animates during it. */
export interface ContentStep extends ContentLine {
  at: EventMatcher
  /** A short handwritten note drawn next to the focused panel. */
  note?: Bilingual
}

export interface ContentWhy extends ContentLine {
  /** The idea the card names, a few words. */
  title: Bilingual
}

export interface LessonContent {
  id: string
  panels: OptionalPanel[]
  intro: { question: Bilingual; lines: ContentLine[] }
  /** Introduces each runtime part; a line whose focus is a panel draws that panel. */
  overview: ContentLine[]
  steps: ContentStep[]
  why: ContentWhy[]
  recap: { takeaways: Bilingual[]; model: Bilingual; lines: ContentLine[] }
}

/* ------------------------------------------------------------------ plan (one language) */

export interface CodeRow {
  /** Display line number, on the first row of a wrapped line only. */
  number: number | null
  /** Source line (1-based, Trace numbering) this row belongs to. */
  sourceLine: number
  text: string
}

export type StackKind = 'script' | 'function' | 'builtin' | 'callback'
export interface StackItem {
  /** Same id as the chip it came from when the frame runs a queued callback. */
  id: string
  label: string
  kind: StackKind
}

export interface QueueItem {
  id: string
  /** What it is: "Timer", "Promise reaction"… */
  kind: string
  /** The callback's code, one line. */
  code: string
}

export interface WebApiItem extends QueueItem {
  /** "0 ms", "30 ms · api.example.test" … */
  detail: string
}

export type LoopPhase = 'idle' | 'task' | 'microtasks' | 'render' | 'halted'

export interface ConsoleRow {
  text: string
  level: 'log' | 'info' | 'warn' | 'error'
}

/** Everything the runtime panels show at one Trace position, in display terms. */
export interface LessonSnapshot {
  position: number
  /** Source line (Trace numbering) running now, or null between Tasks. */
  line: number | null
  stack: StackItem[]
  /** A callback the event loop has taken from a queue whose frame is not on the stack yet. */
  picked: QueueItem | null
  webApis: WebApiItem[]
  tasks: QueueItem[]
  jobs: QueueItem[]
  /** Async functions parked at an await. */
  parked: string[]
  console: ConsoleRow[]
  phase: LoopPhase
  clockMs: number
}

export interface PlanBeat {
  id: string
  scene: SceneId
  say: string
  pause: number
  focus?: FocusTarget
  note?: string
  /** why: the card title. */
  title?: string
  /** Indices into plan.snapshots: the moves this beat animates, in order (execute only). */
  keyframes: number[]
}

export interface LessonPlan {
  id: string
  lang: Lang
  title: string
  description: string
  question: string
  code: CodeRow[]
  panels: OptionalPanel[]
  snapshots: LessonSnapshot[]
  beats: PlanBeat[]
  /** Final Observable Output, in order: what the recap lists. */
  output: string[]
  takeaways: string[]
  model: string
  /** Labels the film draws (panel titles, phase names…), in this language. */
  labels: Record<string, string>
}

/* ------------------------------------------------------------------ timing */

export interface BeatTiming {
  id: string
  start: number
  /** When the voice starts (start + lead). */
  speech: number
  /** Voice length, seconds. */
  speechDuration: number
  end: number
  /** execute: when each keyframe's move plays, in step with the sentence. */
  moves: { start: number; end: number }[]
}

export interface LessonTiming {
  id: string
  lang: Lang
  duration: number
  beats: BeatTiming[]
}
