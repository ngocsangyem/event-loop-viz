import type { Player, StepOptions } from './player'

/**
 * A Player whose navigation defaults to `defaults` (for example `{ showAll: true }`), so UI that
 * calls `player.next(position)` follows the "show all events" toggle without knowing about it.
 * An explicit option on a call still wins.
 */
export function withStepOptions(player: Player, defaults: StepOptions): Player {
  const merged = (o?: StepOptions): StepOptions => ({ ...defaults, ...o })
  return {
    eventCount: player.eventCount,
    stateAt: (p) => player.stateAt(p),
    stepPositions: (o) => player.stepPositions(merged(o)),
    first: (o) => player.first(merged(o)),
    last: (o) => player.last(merged(o)),
    seek: (p, o) => player.seek(p, merged(o)),
    next: (p, o) => player.next(p, merged(o)),
    prev: (p, o) => player.prev(p, merged(o)),
    nextTick: (p, o) => player.nextTick(p, merged(o)),
    prevTick: (p, o) => player.prevTick(p, merged(o)),
    nextTask: (p, o) => player.nextTask(p, merged(o)),
    prevTask: (p, o) => player.prevTask(p, merged(o)),
  }
}
