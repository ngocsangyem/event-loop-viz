/**
 * `<elv-queue>`: a queue or stack lane of rows with a 2px concept-hue left rule, reveal/pop/glide
 * animations between updates. Native custom element, registered by _ds_bundle.js.
 */
export type Concept = 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'error' | 'loop'

export interface QueueRowItem {
  /** Stable key; the same id across updates makes the row glide instead of re-entering. */
  id: string
  /** Mono id in the hue, e.g. "Job #3", "Task #2", "Frame". */
  label: string
  /** Kind of entry, e.g. "Promise reaction", "queueMicrotask", "timer", "script". */
  kind?: string
  /** The callback's source text, e.g. "() => console.log('then 1')". */
  code?: string
  /** Source line of the callback; shown as L<line>. */
  line?: number
  /** new = just arrived (NEW tag); top/running = being run (TOP/RUNNING tag); ghost = left the lane. */
  state?: 'default' | 'new' | 'top' | 'running' | 'ghost'
}

export interface QueueProps {
  /** Rows, head first (stack: top frame first). Set as a DOM property, or as a JSON string attribute. */
  items?: QueueRowItem[] | string
  /** Event-loop concept that colours every row's rule, id and tag. */
  concept?: Concept
  /** Text shown when there are no rows. Default "Empty". */
  empty?: string
}
