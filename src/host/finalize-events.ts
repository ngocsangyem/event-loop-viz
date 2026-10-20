import type { TraceEvent } from '../trace/trace-event'

/**
 * Seals a finished Run's events: a promise:create for a promise that no later event
 * mentions is a Bookkeeping Event (nothing observable happened to it), then every
 * event is frozen so a Trace can be shared without copying.
 */
export function finalizeEvents(events: TraceEvent[]): void {
  const observed = new Set<string>()
  for (const e of events) {
    if (
      e.k === 'promise:reaction' ||
      e.k === 'promise:resolve' ||
      e.k === 'promise:settle' ||
      e.k === 'rejection:track' ||
      e.k === 'rejection:notify' ||
      (e.k === 'job:enqueue' && e.pid !== undefined)
    ) {
      observed.add(e.pid!)
    }
  }
  for (const e of events) {
    if (e.k === 'promise:create' && !observed.has(e.pid)) e.visible = false
    Object.freeze(e)
  }
}
