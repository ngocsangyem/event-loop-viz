/**
 * `<elv-caption>`: the per-step caption: mono meta row, one sentence naming the change, and the
 * phase strip. Native custom element, registered by _ds_bundle.js.
 * Slot: default = the sentence (alternative to the `sentence` attribute).
 */
export interface CaptionPhase {
  /** Mono label, e.g. "TASK #1" or "MICROTASK CHECKPOINT · JOB 3/3". */
  label: string
  /** Hue of the current chip: stack, job, task, webapi, console, error or loop. */
  concept?: 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'error' | 'loop'
  /** done prints a trailing ✓, current is tinted in its hue, next prints a leading "NEXT:". */
  state: 'done' | 'current' | 'next'
}

export interface CaptionProps {
  /** Current step (1-based), shown as "STEP n / total". */
  step?: number
  /** Total steps in the Trace. */
  total?: number
  /** Tick number, shown as "TICK n". */
  tick?: number
  /** Source line of the step, shown as "LINE n". */
  line?: number
  /** Virtual Clock reading as text, e.g. "0 ms". */
  clock?: string
  /** The sentence naming what changed. The default slot overrides it. */
  sentence?: string
  /** Phase strip, in order. DOM property (array) or JSON string attribute in plain HTML. */
  phases?: CaptionPhase[] | string
  /** The Run stopped on its Budget: the current phase reads "HALT · BUDGET" in the accent. */
  halted?: boolean
  /** Default slot: the sentence. */
  children?: unknown
}
