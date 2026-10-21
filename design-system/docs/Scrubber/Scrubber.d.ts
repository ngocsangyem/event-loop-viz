/**
 * `<elv-scrubber>`: the dock's step scrubber: step counter, a 4px track with lanes and a playhead,
 * and the Virtual Clock. A real slider (role=slider; ←/→, Home/End, pointer click/drag).
 * Native custom element, registered by _ds_bundle.js.
 * Event `change`: fires when the user picks a step; `event.detail[0]` is the new 1-based step.
 */
export interface ScrubberSegment {
  /** First step covered (1-based, inclusive). */
  from: number
  /** Last step covered (inclusive). */
  to: number
  /** task = blue Task lane, checkpoint = magenta Microtask Checkpoint lane. */
  kind: 'task' | 'checkpoint'
}

export interface ScrubberMark {
  /** Step the tick sits on (1-based). */
  at: number
  /** console = 2px green tick (output), error = 2px red tick. */
  kind: 'console' | 'error'
}

export interface ScrubberProps {
  /** Total steps in the Trace. */
  total?: number
  /** Current step (1-based). Setting it moves the playhead. */
  value?: number
  /** Virtual Clock reading as text, e.g. "0 ms". */
  clock?: string
  /** Task and Checkpoint spans. DOM property (array) or JSON string attribute in plain HTML. */
  segments?: ScrubberSegment[] | string
  /** Console and error ticks. DOM property (array) or JSON string attribute in plain HTML. */
  marks?: ScrubberMark[] | string
}
