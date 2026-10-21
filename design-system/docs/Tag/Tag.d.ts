/**
 * `<elv-tag>`: a mono uppercase tag or count, text-only by default, optionally tinted with a concept
 * hue and boxed with a soft fill (`NEW`, `CHANGED`, `TIMING-SENSITIVE`). Static, never interactive.
 * Registered by _ds_bundle.js. The label is the default slot.
 */
export interface TagProps {
  /** Concept hue: stack, job, task, webapi, console, error, or loop (the orange accent, "now"). Omit for neutral ink-3. */
  concept?: 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'error' | 'loop'
  /** text = bare label (default); filled = soft hue fill + 1px hue border. */
  tone?: 'text' | 'filled'
  /** Default slot: the label, e.g. "CHANGED". */
  children?: unknown
}
