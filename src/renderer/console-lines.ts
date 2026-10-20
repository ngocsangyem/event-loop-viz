import type { TraceEvent } from '../trace/trace-event'

export interface ConsoleLine {
  kind: 'console' | 'error'
  text: string
}

/**
 * Console text for the events up to the playhead. Exceptions and rejections are
 * printed the way Chrome's console prints them, so the panel reads like the Oracle's.
 */
export function formatConsoleLines(events: readonly TraceEvent[]): ConsoleLine[] {
  const lines: ConsoleLine[] = []
  for (const event of events) {
    if (event.k === 'console') {
      lines.push({ kind: 'console', text: `${event.level}: ${event.text}` })
    } else if (event.k === 'exception:report') {
      const name = event.unsupportedApi ? 'UnsupportedApiError: ' : ''
      lines.push({ kind: 'error', text: `Uncaught ${name}${event.message}` })
    } else if (event.k === 'rejection:notify') {
      lines.push(
        event.outcome === 'unhandled'
          ? { kind: 'error', text: `Uncaught (in promise) ${event.message}` }
          : { kind: 'console', text: `rejectionhandled: ${event.message}` },
      )
    }
  }
  return lines
}
