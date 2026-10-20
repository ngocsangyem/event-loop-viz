/**
 * Observable Output: what a Script reveals to the outside world, in order (ADR-0002).
 * Differential tests compare exactly this against the Oracle (real Chrome), never the internal Trace.
 */
export type ObservableEntry =
  | { kind: 'console'; level: 'log' | 'info' | 'warn' | 'error'; text: string }
  | { kind: 'uncaught-exception'; message: string }
  | { kind: 'unhandled-rejection'; message: string }
  | { kind: 'rejection-handled'; message: string }

export type ObservableOutput = ObservableEntry[]
