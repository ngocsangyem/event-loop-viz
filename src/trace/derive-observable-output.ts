import type { ObservableOutput } from './observable-output'
import type { TraceEvent } from './trace-event'

/**
 * Derives Observable Output from a Trace. Pure, so the UI console and the
 * oracle comparison read the same data and cannot disagree (ADR-0002).
 */
export function deriveObservableOutput(events: readonly TraceEvent[]): ObservableOutput {
  const output: ObservableOutput = []
  for (const event of events) {
    if (event.k === 'console') {
      output.push({ kind: 'console', level: event.level, text: event.text })
    } else if (event.k === 'exception:report') {
      output.push({
        kind: 'uncaught-exception',
        message: event.message,
        ...(event.unsupportedApi && { errorName: 'UnsupportedApiError' as const }),
      })
    } else if (event.k === 'rejection:notify') {
      output.push({
        kind: event.outcome === 'unhandled' ? 'unhandled-rejection' : 'rejection-handled',
        message: event.message,
      })
    }
  }
  return output
}
