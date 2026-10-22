import type { TraceEvent } from '../../trace/trace-event'
import { isDriveTarget } from './drive-step'
import type { DriveTarget, ResolvedDriveStep } from './drive-step'

export const MAX_AI_STEPS = 16
const MAX_TITLE_CHARS = 80
const MAX_BODY_CHARS = 420

/** The model's reply had no usable walkthrough in it. */
export class DriveAiFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DriveAiFormatError'
  }
}

/** The region an event naturally belongs to, for a step whose target is missing or unknown. */
export function fallbackTarget(event: TraceEvent): DriveTarget {
  const k = event.k
  if (k === 'console' || k === 'rejection:notify' || k === 'exception:report') return 'console'
  if (k.startsWith('job:') || k.startsWith('await:') || k.startsWith('asyncgen:')) return 'microtask-queue'
  if (k === 'task:queue') return 'task-queue'
  if (k.startsWith('timer:')) return 'web-apis'
  if (k.startsWith('frame:')) return 'call-stack'
  if (k.startsWith('task:') || k.startsWith('checkpoint:') || k.startsWith('run:')) return 'event-loop'
  return event.loc ? 'source' : 'event-loop'
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** The JSON object in a reply: tolerates a code fence or words around it. */
function jsonOf(reply: string): unknown {
  const start = reply.indexOf('{')
  const end = reply.lastIndexOf('}')
  if (start === -1 || end <= start) throw new DriveAiFormatError('no JSON object in the reply')
  try {
    return JSON.parse(reply.slice(start, end + 1))
  } catch {
    throw new DriveAiFormatError('the reply is not valid JSON')
  }
}

/**
 * Turns the model's reply into steps the replay can show. Steps on an event that is not in the
 * Trace (or not steppable), or without words, are dropped; an unknown target falls back to the
 * event's own region; a line is kept only on a Source step and only inside the Script. The result
 * is in replay order, one step per event, at most MAX_AI_STEPS. No usable step is an error.
 */
export function parseDriveAiSteps(reply: string, events: readonly TraceEvent[], script: string): ResolvedDriveStep[] {
  const parsed = jsonOf(reply) as { steps?: unknown }
  if (!Array.isArray(parsed?.steps)) throw new DriveAiFormatError('the reply has no steps array')
  const lines = script.split('\n').length
  const byPosition = new Map<number, ResolvedDriveStep>()

  for (const raw of parsed.steps as Record<string, unknown>[]) {
    const seq = raw?.seq
    const event = typeof seq === 'number' && Number.isInteger(seq) ? events[seq] : undefined
    const title = text(raw?.title)
    const body = text(raw?.body)
    if (!event || !event.visible || title === '' || byPosition.has(event.seq)) continue
    const target = isDriveTarget(raw.target) ? raw.target : fallbackTarget(event)
    const asked = typeof raw.line === 'number' && Number.isInteger(raw.line) && raw.line >= 1 && raw.line <= lines
    const line = target === 'source' ? (asked ? (raw.line as number) : event.loc?.line) : undefined
    byPosition.set(event.seq, {
      position: event.seq,
      target,
      ...(line === undefined ? {} : { line }),
      title: clip(title, MAX_TITLE_CHARS),
      body: clip(body, MAX_BODY_CHARS),
    })
  }

  const steps = [...byPosition.values()].sort((a, b) => a.position - b.position).slice(0, MAX_AI_STEPS)
  if (steps.length === 0) throw new DriveAiFormatError('no step points at a steppable event')
  return steps
}
