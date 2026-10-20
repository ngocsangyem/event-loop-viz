import type { ReplayState } from '../../player/replay-state'

type Entry = ReplayState['console'][number]

export interface ScreenRow {
  text: string
  /** `error` rows are drawn in the accent red. */
  tone: 'normal' | 'error'
}

export interface ConsoleScreenModel {
  /** The newest rows that fit the screen, oldest first. */
  rows: ScreenRow[]
  /** Entries printed so far, including those scrolled off the top. */
  printed: number
}

const LEVEL_MARK = { log: '>', info: 'i', warn: '!', error: 'x' } as const

function describeEntry(entry: Entry): { text: string; tone: ScreenRow['tone'] } {
  switch (entry.kind) {
    case 'console':
      return {
        text: `${LEVEL_MARK[entry.level]} ${entry.text}`,
        tone: entry.level === 'error' ? 'error' : 'normal',
      }
    case 'uncaught-exception':
      return { text: `Uncaught ${entry.message}`, tone: 'error' }
    case 'unhandled-rejection':
      return { text: `Uncaught (in promise) ${entry.message}`, tone: 'error' }
    case 'rejection-handled':
      return { text: `rejectionhandled: ${entry.message}`, tone: 'normal' }
  }
}

function clip(text: string, columns: number): string {
  return text.length <= columns ? text : `${text.slice(0, Math.max(0, columns - 1))}…`
}

/**
 * The text a console screen of `rows` x `columns` characters shows for one ReplayState.
 * Every row of a multi-line entry repeats the entry's mark, so a scrolled-off first row never
 * leaves an unmarked row behind.
 */
export function consoleScreenOf(
  state: ReplayState,
  size: { rows: number; columns: number },
): ConsoleScreenModel {
  const all: ScreenRow[] = []
  for (const entry of state.console) {
    const { text, tone } = describeEntry(entry)
    const mark = text.slice(0, text.indexOf(' ') + 1)
    text.split('\n').forEach((line, index) => {
      const row = index === 0 ? line : `${mark}${line}`
      all.push({ text: clip(row, size.columns), tone })
    })
  }
  return { rows: all.slice(-size.rows), printed: state.console.length }
}
