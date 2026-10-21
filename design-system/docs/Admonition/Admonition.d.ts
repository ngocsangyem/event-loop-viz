/**
 * `<elv-admonition>`: raised block with a 2px left rule in its tone's hue, a mono glyph label and an
 * Inter body in ink-2. Native custom element, registered by _ds_bundle.js.
 */
export interface AdmonitionProps {
  /** note ※ task blue · halt ▲ accent · error ⚠ red · syntax ↯ red · success ✓ green · turn ❯ accent. */
  tone?: 'note' | 'halt' | 'error' | 'syntax' | 'success' | 'turn'
  /** Mono label after the glyph, e.g. "UNSUPPORTED API · RUN BLOCKED". Defaults: NOTE, HALT, ERROR, SYNTAXERROR, OK, YOUR TURN. */
  label?: string
  /** Default slot: the body text (inline <code> renders mono). Named slot `actions`: link actions such as GO TO LINE 3. */
  children?: unknown
}
