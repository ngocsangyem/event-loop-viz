import type { TraceEvent } from '../../trace/trace-event'
import type { DriveStep, EventMatcher, ResolvedDriveStep } from './drive-step'

function matches(event: TraceEvent, matcher: EventMatcher): boolean {
  if (!event.visible || event.k !== matcher.k) return false
  if (matcher.text !== undefined && !(event.k === 'console' && event.text === matcher.text)) return false
  const fields = event as unknown as Record<string, unknown>
  return Object.entries(matcher.where ?? {}).every(([key, value]) => fields[key] === value)
}

/** The position of the event a matcher names, or null. Only steppable (visible) events count. */
export function findMatchedEvent(events: readonly TraceEvent[], matcher: EventMatcher): number | null {
  const from = matcher.after ? findMatchedEvent(events, matcher.after) : -1
  if (from === null) return null
  const wanted = matcher.nth ?? 1
  let seen = 0
  for (let position = from + 1; position < events.length; position++) {
    if (!matches(events[position]!, matcher)) continue
    seen++
    if (seen === wanted) return position
  }
  return null
}

export interface DriveStepResolution {
  steps: ResolvedDriveStep[]
  /** Steps whose matcher found no event; a non-empty list means the walkthrough does not fit this Trace. */
  unresolved: DriveStep[]
}

/** Places every step on the Trace, keeping the written order. */
export function resolveDriveSteps(steps: readonly DriveStep[], events: readonly TraceEvent[]): DriveStepResolution {
  const resolved: ResolvedDriveStep[] = []
  const unresolved: DriveStep[] = []
  for (const step of steps) {
    const position = findMatchedEvent(events, step.at)
    if (position === null) {
      unresolved.push(step)
      continue
    }
    const { at: _at, ...spot } = step
    resolved.push({ ...spot, position })
  }
  return { steps: resolved, unresolved }
}
