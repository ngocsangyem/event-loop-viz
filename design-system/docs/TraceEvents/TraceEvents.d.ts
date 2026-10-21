/**
 * `<elv-trace-events>`: the Why rail's Trace Events list, grouped by Tick and Task.
 * Native custom element, registered by _ds_bundle.js.
 * Event `select`: fires on row click; `event.detail[0]` is the event number `n`.
 * Slot `header`: content above the list (e.g. a SHOW ALL toggle).
 */
export interface TraceEventItem {
  /** Event number within the Trace. */
  n: number
  /** Mono tag, e.g. "PUSH", "JOB", "LOG". */
  tag: string
  /** Hue of `n` and the tag: stack, job, task, webapi, console, error or loop. */
  concept?: 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'error' | 'loop'
  /** Description of the Trace Event. */
  text: string
}

export interface TraceEventGroup {
  /** Group header, e.g. "TICK 1 · TASK #1 — SCRIPT". */
  label: string
  events: TraceEventItem[]
}

export interface TraceEventsProps {
  /** Groups in Trace order. DOM property (array) or JSON string attribute in plain HTML. */
  groups?: TraceEventGroup[] | string
  /** Number of the active Trace Event: gets the hover-row fill and accent rule; later rows are dimmed. */
  active?: number
  /** Slot `header` (not a prop). */
  children?: unknown
}
