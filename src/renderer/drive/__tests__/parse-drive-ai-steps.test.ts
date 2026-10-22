import { describe, expect, it } from 'vitest'
import type { TraceEvent } from '../../../trace/trace-event'
import { DriveAiFormatError, MAX_AI_STEPS, fallbackTarget, parseDriveAiSteps } from '../parse-drive-ai-steps'

const base = { t: 0, ref: 'HTML:test' as const, visible: true }
const loc = (line: number) => ({ start: 0, end: 1, line, column: 0 })
const events: TraceEvent[] = [
  { ...base, seq: 0, k: 'run:start' },
  { ...base, seq: 1, k: 'console', level: 'log', text: 'a', loc: loc(2) },
  { ...base, seq: 2, k: 'rejection:track', pid: 'p1', op: 'reject', visible: false },
  { ...base, seq: 3, k: 'job:begin', jobId: 'j1' },
  { ...base, seq: 4, k: 'timer:fire', tid: '1' },
]
const script = 'line 1\nline 2\nline 3'
const reply = (steps: unknown[]) => JSON.stringify({ steps })

describe('parseDriveAiSteps', () => {
  it('reads a fenced reply and keeps valid steps in replay order', () => {
    const text = '```json\n' + reply([
      { seq: 4, target: 'web-apis', title: 'Timer', body: 'It fires.' },
      { seq: 1, target: 'console', title: 'Log', body: 'a prints.' },
    ]) + '\n```'
    expect(parseDriveAiSteps(text, events, script).map((s) => s.position)).toEqual([1, 4])
  })

  it('drops steps on unknown, hidden or duplicate events, and steps without a title', () => {
    const steps = parseDriveAiSteps(reply([
      { seq: 99, target: 'console', title: 'x', body: '' },
      { seq: 2, target: 'console', title: 'hidden', body: '' },
      { seq: 3, target: 'microtask-queue', title: '', body: 'no title' },
      { seq: 3, target: 'microtask-queue', title: 'Job', body: '' },
      { seq: 3, target: 'console', title: 'again', body: '' },
      { seq: '4', target: 'web-apis', title: 'string seq', body: '' },
    ]), events, script)
    expect(steps).toEqual([{ position: 3, target: 'microtask-queue', title: 'Job', body: '' }])
  })

  it('falls back to the event region for an unknown target', () => {
    const [step] = parseDriveAiSteps(reply([{ seq: 4, target: 'somewhere', title: 'T', body: '' }]), events, script)
    expect(step?.target).toBe('web-apis')
  })

  it('keeps a line only on Source steps inside the Script, else the event line', () => {
    const steps = parseDriveAiSteps(reply([
      { seq: 1, target: 'source', line: 99, title: 'far line', body: '' },
      { seq: 3, target: 'call-stack', line: 2, title: 'not source', body: '' },
    ]), events, script)
    expect(steps[0]).toMatchObject({ target: 'source', line: 2 })
    expect(steps[1]).not.toHaveProperty('line')
  })

  it(`caps at ${MAX_AI_STEPS} steps`, () => {
    const many: TraceEvent[] = Array.from({ length: 20 }, (_, seq) => ({ ...base, seq, k: 'run:start' }) as TraceEvent)
    const steps = parseDriveAiSteps(reply(many.map((e) => ({ seq: e.seq, target: 'event-loop', title: 't', body: '' }))), many, script)
    expect(steps).toHaveLength(MAX_AI_STEPS)
  })

  it('throws a format error for prose, bad JSON, no steps array or no usable step', () => {
    for (const text of ['Here is your walkthrough!', '{"steps": [', '{"stops": []}', reply([{ seq: 99, title: 'x' }])]) {
      expect(() => parseDriveAiSteps(text, events, script)).toThrow(DriveAiFormatError)
    }
  })
})

describe('fallbackTarget', () => {
  it('maps event kinds to their regions', () => {
    expect(fallbackTarget(events[1]!)).toBe('console')
    expect(fallbackTarget(events[3]!)).toBe('microtask-queue')
    expect(fallbackTarget(events[4]!)).toBe('web-apis')
    expect(fallbackTarget(events[0]!)).toBe('event-loop')
  })
})
