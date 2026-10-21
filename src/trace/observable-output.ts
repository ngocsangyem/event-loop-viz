/**
 * Observable Output: what a Script reveals to the outside world, in order.
 * Differential tests compare exactly this against the Oracle (real Chrome), never the internal Trace.
 */
export type ObservableEntry =
  | { kind: 'console'; level: 'log' | 'info' | 'warn' | 'error'; text: string }
  | {
      kind: 'uncaught-exception'
      message: string
      /**
       * Set only for simulator-originated errors (Unsupported APIs). Chrome has no such error,
       * so Oracle Goldens never carry it and every Chrome-comparable entry omits it.
       */
      errorName?: 'UnsupportedApiError'
    }
  | { kind: 'unhandled-rejection'; message: string }
  | { kind: 'rejection-handled'; message: string }

export type ObservableOutput = ObservableEntry[]
