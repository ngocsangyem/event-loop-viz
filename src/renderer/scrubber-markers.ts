import type { Player } from '../player/player'
import type { TraceEvent } from '../trace/trace-event'

export type MarkerFamily = 'task' | 'job' | 'timer' | 'console' | 'error'

export interface ScrubberMarker {
  /** Event position the marker seeks to. */
  seq: number
  /** Index among the Player's step positions; the scrubber's slider value. */
  index: number
  family: MarkerFamily
}

/** The event family an event is marked as on the scrubber, or null when it gets no marker. */
export function markerFamily(event: TraceEvent): MarkerFamily | null {
  switch (event.k) {
    case 'task:begin':
      return 'task'
    case 'job:begin':
      return 'job'
    case 'timer:fire':
      return 'timer'
    case 'console':
      return 'console'
    case 'exception:report':
    case 'run:halted':
      return 'error'
    case 'rejection:notify':
      return event.outcome === 'unhandled' ? 'error' : null
    default:
      return null
  }
}

/**
 * Markers for every steppable event that has a family. Bookkeeping Events are not steps,
 * so they never get a marker; the slider only ever lands on steps.
 */
export function buildScrubberMarkers(
  player: Player,
  events: readonly TraceEvent[],
): ScrubberMarker[] {
  const markers: ScrubberMarker[] = []
  player.stepPositions().forEach((seq, index) => {
    const event = events[seq]
    const family = event && markerFamily(event)
    if (family) markers.push({ seq, index, family })
  })
  return markers
}
