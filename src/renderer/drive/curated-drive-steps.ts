import { CURATED_DRIVE_STEPS } from '@/examples/drive-steps'
import type { TraceEvent } from '../../trace/trace-event'
import type { ResolvedDriveStep } from './drive-step'
import { resolveDriveSteps } from './resolve-drive-steps'

/** `await-vs-then` → `awaitVsThen`: example ids are kebab-case, message keys camelCase. */
export const exampleMessageKey = (id: string) => id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/**
 * The curated walkthrough of an example placed on this Trace, or null when the example has none
 * or any of its steps no longer finds its event (an edited example): then the walkthrough does
 * not fit and the caller falls back to other steps.
 */
export function curatedDriveSteps(
  exampleId: string | null,
  events: readonly TraceEvent[],
  t: (key: string) => string,
): ResolvedDriveStep[] | null {
  const curated = exampleId ? CURATED_DRIVE_STEPS[exampleId] : undefined
  if (!exampleId || !curated || curated.length === 0) return null
  const base = `drive.examples.${exampleMessageKey(exampleId)}`
  const { steps, unresolved } = resolveDriveSteps(
    curated.map(({ key, ...step }) => ({ ...step, title: t(`${base}.${key}.title`), body: t(`${base}.${key}.body`) })),
    events,
  )
  return unresolved.length === 0 ? steps : null
}
