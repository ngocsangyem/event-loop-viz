/** The two moves of a player that decide whether a position change is one step. */
export interface StepNavigator {
  next(position: number): number
  prev(position: number): number
}

/** Most steps playback may pass over at once; a malformed `sameView` must not loop forever. */
const MAX_HOPS = 200

/**
 * Whether the playhead went from `from` to `to` by exactly one step, forward or back.
 * Playback skips steps that look the same (`sameView`), so one forward step may span several
 * positions. Everything else (scrubber, Task/Tick jumps, Start/End, tour stops) is a jump.
 */
export function isSingleStep(
  player: StepNavigator,
  from: number,
  to: number,
  sameView?: (from: number, to: number) => boolean,
): boolean {
  if (from === to) return false
  if (player.prev(from) === to) return true
  // Same walk as playback: pass over steps that look like the one we left.
  let candidate = player.next(from)
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const following = player.next(candidate)
    const atEnd = following === candidate
    const skipped = !atEnd && sameView !== undefined && sameView(from, candidate)
    if (!skipped) return candidate === to
    candidate = following
  }
  return false
}
