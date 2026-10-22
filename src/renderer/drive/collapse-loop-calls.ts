import type { NarratedStep } from './narrate-trace'

/** More than this many back-to-back calls of one built-in on one line is a loop, not a chain. */
const LOOP_RUN = 3

/**
 * A loop calling one built-in over and over (a busy wait on `Date.now()`) becomes one step that
 * says how many calls it made. Short runs stay as they are: `.then().then()` on one line is a
 * chain of separate calls, each worth its own step.
 */
export function collapseLoops(steps: NarratedStep[]): NarratedStep[] {
  const out: NarratedStep[] = []
  let i = 0
  while (i < steps.length) {
    const step = steps[i]!
    let end = i + 1
    const same = (other: NarratedStep | undefined) =>
      other?.kind === 'builtinCall' && other.params.name === step.params.name && other.params.line === step.params.line
    if (step.kind === 'builtinCall') while (same(steps[end])) end++
    const run = end - i
    out.push(run > LOOP_RUN ? { ...step, variant: 'builtinCall.repeated', params: { ...step.params, count: run } } : step)
    if (run <= LOOP_RUN) end = i + 1
    i = end
  }
  return out
}
