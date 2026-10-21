import type { ChipPlace } from './callback-chip-model'

/** More simultaneous flights read as noise, so beyond this every chip just snaps. */
export const MAX_TRAVELLERS = 6

/** Places a callback is scheduled from, so a new chip there can leave the highlighted code. */
const EDITOR_REACHABLE: ReadonlySet<ChipPlace> = new Set(['webapis', 'taskq', 'microq'])

/** A running row is the same row as its queue entry, so changing between them is not a flight. */
const SAME_ROW: Readonly<Partial<Record<ChipPlace, ChipPlace>>> = {
  taskq: 'taskq-running',
  microq: 'microq-running',
}

export interface ChipTravelPlan {
  /** Chips that were somewhere and are somewhere else now. */
  moved: string[]
  /** Chips that are new in a place the code can schedule into. */
  entered: string[]
  /** More travellers than flights allowed. */
  tooMany: boolean
}

/** Which chips change container between two states (chip id to its place). */
export function diffChipPlaces(
  previous: ReadonlyMap<string, { place: ChipPlace }>,
  next: ReadonlyMap<string, { place: ChipPlace }>,
): ChipTravelPlan {
  const moved: string[] = []
  const entered: string[] = []
  for (const [id, { place }] of next) {
    const before = previous.get(id)?.place
    if (before === undefined) {
      if (EDITOR_REACHABLE.has(place)) entered.push(id)
    } else if (before !== place && SAME_ROW[before] !== place) {
      moved.push(id)
    }
  }
  return { moved, entered, tooMany: moved.length + entered.length > MAX_TRAVELLERS }
}

const MIN_TRAVEL_MS = 160
const MAX_TRAVEL_MS = 450
/** Share of a playback step one flight may take, so it lands before the next step begins. */
const STEP_SHARE = 0.85

/** How long a flight lasts: fitted to the playback step while playing, calm for a manual step. */
export function travelDurationMs(playing: boolean, stepIntervalMs: number): number {
  if (!playing) return MAX_TRAVEL_MS
  return Math.min(MAX_TRAVEL_MS, Math.max(MIN_TRAVEL_MS, STEP_SHARE * stepIntervalMs))
}
