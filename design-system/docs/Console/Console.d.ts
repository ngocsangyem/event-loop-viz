/**
 * `<elv-console>`: console output rows in a `36px tag | text | meta` mono grid.
 * Native custom element, registered by _ds_bundle.js.
 */
export interface ConsoleLine {
  /** log LOG ink-3 · info INF · warn WRN yellow · error ERR red · rejection REJ (unhandled rejection) red. */
  level: 'log' | 'info' | 'warn' | 'error' | 'rejection'
  /** The printed value, e.g. "script start". */
  text: string
  /** Source line that printed it; shown as L<line>. */
  line?: number
  /** Number of identical collapsed lines; shown as ×N when above 1. */
  repeat?: number
  /** For level "error": nothing caught it — adds the UNCAUGHT label and a 2px red rule. */
  uncaught?: boolean
}

export interface ConsoleProps {
  /** Lines in print order. Set as a DOM property (array), or as a JSON string attribute in plain HTML. */
  lines?: ConsoleLine[] | string
  /** Text shown before anything prints. Default "No output yet". */
  empty?: string
}
