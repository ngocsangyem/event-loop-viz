// @vitest-environment node
import { runScript } from '../run-script'
import type { Trace, TraceEvent } from '../../trace/trace-event'

export async function traceOf(script: string): Promise<Trace> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.trace
}

export type Of<K extends TraceEvent['k']> = Extract<TraceEvent, { k: K }>

export function eventsOf<K extends TraceEvent['k']>(trace: Trace, k: K): Of<K>[] {
  return trace.events.filter((e): e is Of<K> => e.k === k)
}
