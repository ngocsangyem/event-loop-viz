import type { CallbackHandle } from './engine-adapter'
import type { HostRunContext } from './host-run-context'
import { HTML_ANIMATION_FRAMES } from './host-spec-references'

/**
 * Rendering opportunities on a 60 Hz grid that starts FRAME_PHASE_US after the Run starts.
 * Chrome 155 ran its first frame 2 to 7 ms after the script began and every 16.7 ms after; a
 * 0 ms timer always ran before the first frame and an 8 ms timer always after it, so the phase is
 * fixed between them (docs/research/host-api-semantics.md).
 */
export const FRAME_PHASE_US = 4_000
export const FRAME_PERIOD_US = 1_000_000 / 60

/** Grid point k, rounded to the microsecond the Virtual Clock counts in. */
const gridPoint = (k: number) => Math.round(FRAME_PHASE_US + k * FRAME_PERIOD_US)

/** The first grid point strictly after `us`. */
export function gridPointAfter(us: number): number {
  let k = Math.max(0, Math.floor((us - FRAME_PHASE_US) / FRAME_PERIOD_US))
  while (gridPoint(k) <= us) k++
  return gridPoint(k)
}

/** The last grid point at or before `us` (the vsync that started a late frame). */
function gridPointAtOrBefore(us: number): number {
  const after = gridPointAfter(us)
  const k = Math.round((after - FRAME_PHASE_US) / FRAME_PERIOD_US) - 1
  return k < 0 ? after : gridPoint(k)
}

export interface AnimationFrameCallback {
  rid: number
  handle: CallbackHandle
  opId: string
  taskId: string
}

/**
 * HTML map of animation frame callbacks plus the frame clock. A grid point that passes while a
 * Task runs is not lost: the next rendering step is due at that missed point, so it runs before
 * Tasks queued after it (Chrome ran rAF before a 0 ms timer set at the end of a 30 ms script). A
 * grid point that passes while the loop idles with no callback waiting is consumed.
 */
export function createAnimationFrameScheduler(ctx: HostRunContext) {
  let ridCounter = 0
  let callbacks: AnimationFrameCallback[] = []
  /** Callbacks of the rendering step in progress that have not run yet; one may cancel another. */
  let running: AnimationFrameCallback[] = []
  /** Every grid point up to here has had its rendering opportunity. */
  let consumedUpToUs = 0

  return {
    request(handle: CallbackHandle): number {
      const rid = ++ridCounter
      const { opId, taskId } = ctx.startWebApi({ api: 'requestAnimationFrame', ...(handle.info && { callback: handle.info }) })
      callbacks.push({ rid, handle, opId, taskId })
      return rid
    },
    /** Removes a callback that has not run; returns its operation id so a queued Task can go too. */
    cancel(rid: number): string | undefined {
      const entry = callbacks.find((c) => c.rid === rid) ?? running.find((c) => c.rid === rid)
      if (!entry) return undefined
      callbacks = callbacks.filter((c) => c !== entry)
      running = running.filter((c) => c !== entry)
      return entry.opId
    },
    /** Called just before a frame's callback runs: false when an earlier callback cancelled it. */
    claim(entry: AnimationFrameCallback): boolean {
      const at = running.indexOf(entry)
      if (at === -1) return false
      running.splice(at, 1)
      return true
    },
    get pending(): boolean {
      return callbacks.length > 0
    },
    /**
     * When the next rendering step is due, or undefined when no callback waits. Missed grid
     * points with nothing to run are consumed here, so a later request waits for the next vsync.
     */
    nextFrameDueUs(nowUs: number): number | undefined {
      const first = gridPointAfter(consumedUpToUs)
      if (callbacks.length === 0) {
        if (first <= nowUs) consumedUpToUs = nowUs
        return undefined
      }
      return first
    },
    /** The loop idled until `us` with no callback waiting: those grid points had nothing to do. */
    idleUntil(us: number) {
      if (callbacks.length === 0 && us > consumedUpToUs) consumedUpToUs = us
    },
    /**
     * Starts the rendering step at `nowUs`: takes the callbacks requested so far (ones requested
     * by these callbacks wait for the next frame) and returns them with the frame timestamp.
     */
    takeFrame(nowUs: number): { frameMs: number; callbacks: AnimationFrameCallback[] } {
      const taken = callbacks
      callbacks = []
      running = taken.slice()
      consumedUpToUs = nowUs
      return { frameMs: gridPointAtOrBefore(nowUs) / 1000, callbacks: taken }
    },
    handles: () => [...callbacks, ...running].map((c) => c.handle),
    ref: HTML_ANIMATION_FRAMES as typeof HTML_ANIMATION_FRAMES,
  }
}
