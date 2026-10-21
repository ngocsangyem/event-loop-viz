import { describe, expect, it } from 'vitest'
import { createInitialState } from '@/player/replay-state'
import type { ReplayState } from '@/player/replay-state'
import type { TraceEvent } from '@/trace/trace-event'
import {
  MAX_CONSOLE_LINES, MAX_SCRIPT_CHARS, MAX_TRACE_EVENTS, buildRunContext, currentStep, numberedScript,
} from '../build-run-context'
import type { RunContextInput } from '../build-run-context'

function event(seq: number, body: Partial<TraceEvent> & { k: TraceEvent['k'] }, visible = true): TraceEvent {
  return {
    seq, t: seq * 1000, ref: 'HTML:event-loop', visible,
    loc: { start: 0, end: 1, line: seq + 1, column: 0 },
    ...body,
  } as TraceEvent
}

const events: TraceEvent[] = [
  event(0, { k: 'run:start' }),
  event(1, { k: 'task:queue', taskId: 'T1', source: 'script' }),
  event(2, { k: 'task:begin', taskId: 'T1' }),
  event(3, { k: 'console', level: 'log', text: 'sync' }),
]

const input = (over: Partial<RunContextInput>): RunContextInput => ({
  script: '', events, position: 2, state: createInitialState(), finalState: createInitialState(), ...over,
})

describe('buildRunContext', () => {
  it('numbers the Script lines and lists every visible event of the Run with its explanation', () => {
    const hidden = [...events, event(4, { k: 'run:start' }, false)]
    const out = buildRunContext(input({ script: 'a()\nb()', events: hidden }))
    expect(out).toContain('1| a()\n2| b()')
    expect(out).toContain('Trace of the whole Run (4 visible events, oldest first):\n#0 run:start')
    expect(out).toContain('#3 console (line 4')
    expect(out).not.toContain('#4 ')
    expect(out).toContain('The event loop starts running Task T1.')
  })

  it("names the learner's playhead and the Run's whole console output", () => {
    const finalState = { ...createInitialState(), console: [{ kind: 'console' as const, level: 'log' as const, text: 'done' }] }
    const out = buildRunContext(input({ position: 2, finalState }))
    expect(out).toContain("The learner's playhead is at:\n#2 task:begin (line 3")
    expect(out).toContain('Console output of the whole Run:\n[log] done')
  })

  it('cuts a long Trace and says how many events are missing', () => {
    const many = Array.from({ length: MAX_TRACE_EVENTS + 7 }, (_, i) => event(i, { k: 'run:start' }))
    const out = buildRunContext(input({ events: many, position: 0 }))
    expect(out).toContain('(Trace truncated: 7 more visible events not shown)')
    expect(out).not.toContain(`#${MAX_TRACE_EVENTS} `)
  })

  it('says there is no Trace before a Run but still sends the Script', () => {
    const out = buildRunContext(input({ script: 'x', events: [], position: 0 }))
    expect(out).toContain('1| x')
    expect(out).toContain('No Run yet')
    expect(out).not.toContain('Trace of the whole Run')
  })

  it('truncates a long Script at a line boundary and says so', () => {
    const script = Array.from({ length: 2000 }, (_, i) => `console.log(${i})`).join('\n')
    const out = numberedScript(script)
    expect(out.length).toBeLessThan(MAX_SCRIPT_CHARS + 200)
    expect(out).toMatch(/\(Script truncated: \d+ more lines not shown\)$/)
  })

  it('summarizes stack, queues, timers, clock and the tail of the console', () => {
    const state: ReplayState = {
      ...createInitialState(),
      clockUs: 5000,
      stack: [{ frameId: 'f1', label: 'main', builtin: false }],
      tasks: [{ taskId: 'T2', source: 'timer', dueUs: 10000 }],
      jobs: [{ jobId: 'J1', jobKind: 'reaction', outcome: 'fulfill' }],
      timers: [{ tid: 'tm1', requestedMs: 10, clampedMs: 10, repeat: false, dueUs: 10000 }],
      console: Array.from({ length: MAX_CONSOLE_LINES + 5 }, (_, i) => ({
        kind: 'console' as const, level: 'log' as const, text: `line ${i}`,
      })),
    }
    const out = buildRunContext(input({ position: 3, state }))
    expect(out).toContain('Virtual Clock: 5 ms')
    expect(out).toContain('Call stack (top last): main')
    expect(out).toContain('Task queue: T2 from timer due 10 ms')
    expect(out).toContain('Microtask queue (Jobs): J1 reaction (fulfill)')
    expect(out).toContain('Pending timers: tm1 due 10 ms')
    expect(out).toContain('(5 earlier lines omitted)')
    expect(out).toContain('[log] line 24')
    expect(out).not.toContain('[log] line 0\n')
  })
})

describe('currentStep', () => {
  it('names the event at the playhead, or null without a Trace', () => {
    expect(currentStep(events, 2)).toEqual({ seq: 2, kind: 'task:begin' })
    expect(currentStep([], 0)).toBeNull()
  })
})
