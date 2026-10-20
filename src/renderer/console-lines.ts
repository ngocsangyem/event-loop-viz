import type { ObservableOutput } from '../trace/observable-output'

export interface ConsoleLine {
  kind: 'console' | 'error'
  text: string
}

// Observable Output deliberately drops the Unsupported API tag (Chrome has no such thing),
// so the stub's fixed message shape is the only marker left at this layer.
const UNSUPPORTED_API_MESSAGE = /^\S+ is not supported in v1$/

/**
 * Console text for the Observable Output up to the playhead (as folded by the player).
 * Exceptions and rejections are printed the way Chrome's console prints them.
 */
export function formatConsoleLines(output: ObservableOutput): ConsoleLine[] {
  return output.map((entry): ConsoleLine => {
    switch (entry.kind) {
      case 'console':
        return { kind: 'console', text: `${entry.level}: ${entry.text}` }
      case 'uncaught-exception': {
        const name = UNSUPPORTED_API_MESSAGE.test(entry.message) ? 'UnsupportedApiError: ' : ''
        return { kind: 'error', text: `Uncaught ${name}${entry.message}` }
      }
      case 'unhandled-rejection':
        return { kind: 'error', text: `Uncaught (in promise) ${entry.message}` }
      case 'rejection-handled':
        return { kind: 'console', text: `rejectionhandled: ${entry.message}` }
    }
  })
}
