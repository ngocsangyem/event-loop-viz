import type { ObservableOutput } from '../trace/observable-output'

/** The three-letter tag column of a console row. */
export type ConsoleTag = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'REJ'

/** Chrome's own prefix for output a Script did not print itself; the panel translates it. */
export type ConsolePrefix = 'uncaught' | 'unhandled-rejection' | 'rejection-handled'

export interface ConsoleRow {
  tag: ConsoleTag
  /** Picks the row tint and tag colour: warnings and errors are tinted, the rest are plain. */
  tone: 'log' | 'info' | 'warn' | 'error'
  prefix?: ConsolePrefix
  /** An uncaught exception or unhandled rejection: the row also gets a 2px error rule. */
  ruled: boolean
  text: string
  /** How many identical consecutive lines this row stands for. */
  count: number
  /** `L3 · Job #1`: where the line was printed, when the Trace says. */
  meta: string | null
}

type LineBody = Omit<ConsoleRow, 'count' | 'meta'>

function bodyOf(entry: ObservableOutput[number]): LineBody {
  switch (entry.kind) {
    case 'console': {
      const tag = { log: 'LOG', info: 'INF', warn: 'WRN', error: 'ERR' } as const
      return { tag: tag[entry.level], tone: entry.level, ruled: false, text: entry.text }
    }
    case 'uncaught-exception': {
      const name = entry.errorName ? `${entry.errorName}: ` : ''
      return { tag: 'ERR', tone: 'error', prefix: 'uncaught', ruled: true, text: `${name}${entry.message}` }
    }
    case 'unhandled-rejection':
      return { tag: 'REJ', tone: 'error', prefix: 'unhandled-rejection', ruled: true, text: entry.message }
    case 'rejection-handled':
      return { tag: 'LOG', tone: 'log', prefix: 'rejection-handled', ruled: false, text: entry.message }
  }
}

const sameLine = (a: LineBody, b: LineBody) => a.tag === b.tag && a.prefix === b.prefix && a.text === b.text

/**
 * Console panel rows for the Observable Output up to the playhead (as folded by the player).
 * Identical consecutive lines collapse into one row with a count, like Chrome's console. `meta`
 * is one entry per output line (see console-line-meta.ts); a collapsed row shows its latest.
 */
export function consoleRowsOf(output: ObservableOutput, meta: readonly (string | null)[] = []): ConsoleRow[] {
  const lines: ConsoleRow[] = []
  output.forEach((entry, i) => {
    const body = bodyOf(entry)
    const previous = lines[lines.length - 1]
    if (previous && sameLine(previous, body)) {
      previous.count++
      previous.meta = meta[i] ?? null
    } else {
      lines.push({ ...body, count: 1, meta: meta[i] ?? null })
    }
  })
  return lines
}

/** A flat one-line-per-entry text form (the diagram's console rows), the way Chrome prints it. */
export interface ConsoleLine {
  kind: 'console' | 'error'
  text: string
}

export function formatConsoleLines(output: ObservableOutput): ConsoleLine[] {
  return output.map((entry): ConsoleLine => {
    switch (entry.kind) {
      case 'console':
        return { kind: 'console', text: `${entry.level}: ${entry.text}` }
      case 'uncaught-exception': {
        const name = entry.errorName ? `${entry.errorName}: ` : ''
        return { kind: 'error', text: `Uncaught ${name}${entry.message}` }
      }
      case 'unhandled-rejection':
        return { kind: 'error', text: `Uncaught (in promise) ${entry.message}` }
      case 'rejection-handled':
        return { kind: 'console', text: `rejectionhandled: ${entry.message}` }
    }
  })
}
