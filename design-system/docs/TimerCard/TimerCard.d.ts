/**
 * `<elv-timer-card>`: one Web APIs timer entry with a Virtual Clock progress bar.
 * Native custom element, registered by _ds_bundle.js. Tinted with the webapi (cyan) concept.
 */
export interface TimerCardProps {
  /** Mono id shown in the hue. Default "TIMER #1". */
  label?: string
  /** The API that created the timer. Default "setTimeout". */
  api?: 'setTimeout' | 'setInterval'
  /** Requested delay in Virtual Clock ms. Default 0. */
  delay?: number
  /** Virtual Clock ms elapsed since registration; drives the progress bar (elapsed / delay). Default 0. */
  elapsed?: number
  /** Absolute Virtual Clock time the timer is due; shown as "due at N ms". Omit to hide. */
  due?: number
  /** Source line of the call; shown as L<line>. */
  line?: number
  /** Callback source text, e.g. "() => console.log('timeout')". */
  code?: string
  /** pending (default) · new (soft fill, NEW tag) · fired (dashed ghost, full bar) · interval (repeating, shows ×fires). */
  state?: 'pending' | 'new' | 'fired' | 'interval'
  /** With state "fired": the Task the timer became, e.g. "TASK #2"; shown as FIRED → TASK #2. */
  task?: string
  /** With state "interval": how many times it has fired; shown as ×N. */
  fires?: number
}
