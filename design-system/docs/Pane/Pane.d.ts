/**
 * `<elv-pane>`: a ruled pane with a 38px header (8px concept-hue square, mono uppercase title,
 * count, state label) and a body slot. Native custom element, registered by _ds_bundle.js.
 * Attributes are kebab/lowercase strings; slots are native (`slot="actions"`).
 */
export type Concept = 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'error' | 'loop'

export interface PaneProps {
  /** Pane title, e.g. "Call Stack". Rendered in mono uppercase. */
  title: string
  /** Event-loop concept that colours the header square, CHANGED tint and state label. */
  concept?: Concept
  /** Item count shown after the title. Omit for panes without a count. */
  count?: number
  /** Focal state at this step: `changed` = soft tint + 2px top rule + CHANGED; `running` = RUNNING label. */
  state?: 'idle' | 'changed' | 'running'
  /** Default slot: the pane body (usually an <elv-queue>). Named slot `actions`: header-end controls. */
  children?: unknown
}
