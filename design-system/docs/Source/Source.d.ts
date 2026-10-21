/**
 * `<elv-source>`: the read-only Source pane body: gutter, concept-aware highlighting, current-line rule,
 * queued-work squares and diagnostics. No header; compose it inside `<elv-pane title="Source · Read-only">`.
 * Native custom element, registered by _ds_bundle.js.
 */
export interface QueuedMark {
  /** 1-based source line (absolute, counting from start-line). */
  line: number
  /** Lane the pending work will land in: "webapi" while a timer waits, "task" once it fired, "job" for Promise reactions. */
  concept: 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'error' | 'loop'
}

export interface SourceDiagnostic {
  /** 1-based source line. */
  line: number
  /** First flagged column, 0-based. */
  from: number
  /** One past the last flagged column. */
  to: number
  /** "unsupported": warning row `⚠ UNSUPPORTED API · <message>`. "syntax": gutter ↯ and row `↯ <message>`. */
  kind: 'unsupported' | 'syntax'
  /** For unsupported: the API name, e.g. "fetch". For syntax: e.g. "SyntaxError: Unexpected token ')'". */
  message: string
}

export interface SourceProps {
  /** The Script text, lines separated by newline. Taken from this attribute/property only, not from slot content. */
  code?: string
  /** 1-based line of the current step: hover-row fill and a 2px accent rule. Omit for none. */
  current?: number
  /** Lines whose work is still queued, drawn as 8px gutter squares. Array property, or JSON string attribute in plain HTML. */
  queued?: QueuedMark[] | string
  /** Flagged ranges with lint rows. Array property, or JSON string attribute in plain HTML. */
  diagnostics?: SourceDiagnostic[] | string
  /** Number shown on the first line. Default 1. */
  startLine?: number
}
