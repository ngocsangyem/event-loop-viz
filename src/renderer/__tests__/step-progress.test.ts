import { describe, expect, it } from 'vitest'
import type { TraceEvent } from '../../trace/trace-event'
import { stepProgressOf } from '../step-progress'

const events = (visible: boolean[]) => visible.map((v, seq) => ({ seq, visible: v }) as unknown as TraceEvent)

describe('stepProgressOf', () => {
  it('counts visible events up to the playhead', () => {
    expect(stepProgressOf(events([true, false, true, true]), 2)).toEqual({ step: 2, total: 3 })
  })

  it('never reports step 0 once a Trace has steps', () => {
    expect(stepProgressOf(events([false, true]), 0)).toEqual({ step: 1, total: 1 })
  })

  it('is 0 / 0 before a Run', () => {
    expect(stepProgressOf([], 0)).toEqual({ step: 0, total: 0 })
  })
})
