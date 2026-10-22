import { CURATED_DRIVE_NOTES } from '@/examples/drive-steps'
import type { Trace } from '../../trace/trace-event'
import { DRIVE_INFO_SOURCES, infoKeyFor } from './drive-info'
import type { DriveInfoKey } from './drive-info'
import type { ResolvedDriveStep } from './drive-step'
import { narrateTrace } from './narrate-trace'
import { narratedText } from './narrated-step-text'
import { findMatchedEvent } from './resolve-drive-steps'

type Translate = (key: string, params?: Record<string, unknown>) => string

/** `await-vs-then` → `awaitVsThen`: example ids are kebab-case, message keys camelCase. */
export const exampleMessageKey = (id: string) => id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/** Every narrated step in words, each mechanism's "under the hood" note on its first step only. */
export function narratedDriveSteps(trace: Trace, t: Translate): ResolvedDriveStep[] {
  const shown = new Set<DriveInfoKey>()
  return narrateTrace(trace).map((step) => {
    const key = infoKeyFor(step)
    const info = key && !shown.has(key)
      ? { title: t(`drive.info.${key}.title`), body: t(`drive.info.${key}.body`), ...DRIVE_INFO_SOURCES[key] }
      : undefined
    if (key) shown.add(key)
    return {
      position: step.position,
      target: step.target,
      ...(step.line === undefined ? {} : { line: step.line }),
      ...(step.code === undefined ? {} : { code: step.code }),
      ...narratedText(step, t),
      ...(info ? { info } : {}),
    }
  })
}

/**
 * An example's walkthrough: every step built from this Trace, with the example's why notes on
 * the steps they stand on. Null when the example has no notes, or when a note no longer lands on
 * a step (the Script was edited away from the example): the caller then falls back.
 */
export function curatedDriveSteps(exampleId: string | null, trace: Trace, t: Translate): ResolvedDriveStep[] | null {
  const notes = exampleId ? CURATED_DRIVE_NOTES[exampleId] : undefined
  if (!exampleId || !notes) return null
  const steps = narratedDriveSteps(trace, t)
  const at = new Map(steps.map((step, i) => [step.position, i]))
  const base = `drive.examples.${exampleMessageKey(exampleId)}`
  for (const note of notes) {
    const position = findMatchedEvent(trace.events, note.at)
    const i = position === null ? undefined : at.get(position)
    if (i === undefined) return null
    steps[i] = { ...steps[i]!, note: t(`${base}.${note.key}`) }
  }
  return steps
}
