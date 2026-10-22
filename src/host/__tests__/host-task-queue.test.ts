// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createHostTaskQueue, enqueuedBefore } from '../host-task-queue'
import { createHostRunContext } from '../host-run-context'
import { DEFAULT_BUDGETS } from '../../trace/default-budgets'
import type { CallbackHandle } from '../engine-adapter'

const handle = (): CallbackHandle => ({ __callbackHandle: true })
const setup = () => {
  const ctx = createHostRunContext({ nodeCostUs: 1, randomSeed: 0, hostProfile: 'chrome-155', budgets: DEFAULT_BUDGETS })
  let order = 0
  return { ctx, queue: createHostTaskQueue(ctx, () => ++order) }
}

describe('host task queue', () => {
  it('queues a ready Task at once, on its source', () => {
    const { ctx, queue } = setup()
    const taskId = queue.queue('posted-message', handle())
    expect(ctx.events[ctx.events.length - 1]).toMatchObject({ k: 'task:queue', taskId, source: 'posted-message', dueUs: 0 })
  })

  it('keeps a delayed Task out of its queue until the Virtual Clock reaches it', () => {
    const { ctx, queue } = setup()
    queue.queue('networking', handle(), { delayMs: 30, opId: 'op-1' })
    expect(ctx.events.some((e) => e.k === 'task:queue')).toBe(false)
    queue.queueDue(29_999)
    expect(ctx.events.some((e) => e.k === 'task:queue')).toBe(false)
    queue.queueDue(30_000)
    expect(ctx.events[ctx.events.length - 1]).toMatchObject({ k: 'task:queue', source: 'networking', opId: 'op-1', dueUs: 30_000 })
  })

  it('peeks the earliest due Task, then the earliest enqueued', () => {
    const { queue } = setup()
    queue.queue('networking', handle(), { delayMs: 10 })
    const ready = queue.queue('port-message', handle())
    expect(queue.peek()?.taskId).toBe(ready)
  })

  it('orders by due time, then by host-wide enqueue order', () => {
    expect(enqueuedBefore({ dueUs: 1, order: 9 }, { dueUs: 2, order: 1 })).toBe(true)
    expect(enqueuedBefore({ dueUs: 2, order: 1 }, { dueUs: 2, order: 3 })).toBe(true)
    expect(enqueuedBefore({ dueUs: 2, order: 3 }, { dueUs: 2, order: 1 })).toBe(false)
  })
})
