import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { Trace } from '../../../trace/trace-event'
import type { ModeTab } from '../../use-app-layout'
import type { VisualizerView } from '../../use-visualizer-view'
import type { ResolvedDriveStep } from '../drive-step'
import { useDriveSession } from '../use-drive-session'

const traceA = { header: {}, events: [] } as unknown as Trace
const traceB = { header: {}, events: [] } as unknown as Trace
const stepAt = (position: number): ResolvedDriveStep => ({ position, target: 'console', title: `#${position}`, body: '' })

function setup(steps: readonly ResolvedDriveStep[] = [stepAt(3), stepAt(7), stepAt(9)], initial: Trace | null = traceA) {
  const trace = shallowRef<Trace | null>(initial)
  const position = shallowRef(0)
  const view = shallowRef<VisualizerView>('3d')
  const tab = shallowRef<ModeTab>('script')
  const pause = vi.fn()
  const ensureRun = vi.fn(async () => {
    if (!trace.value) trace.value = traceA
  })
  const loadSteps = vi.fn(async () => steps)
  const scope = effectScope()
  const session = scope.run(() => useDriveSession({ trace, position, view, tab, ensureRun, pause, loadSteps }))!
  return { session, trace, position, view, tab, pause, ensureRun, loadSteps }
}

describe('useDriveSession', () => {
  it('runs first when there is no Trace, then lands on step 1 in Panels on the REPLAY tab', async () => {
    const { session, position, view, tab, pause, ensureRun } = setup(undefined, null)
    await session.start()
    expect(ensureRun).toHaveBeenCalled()
    expect(session.status.value).toBe('ready')
    expect(position.value).toBe(3)
    expect(view.value).toBe('panels')
    expect(tab.value).toBe('replay')
    expect(pause).toHaveBeenCalled()
  })

  it('keeps the Diagram: it has every spot too', async () => {
    const { session, view } = setup()
    view.value = 'diagram'
    await session.start()
    expect(view.value).toBe('diagram')
  })

  it('steps forward and back, clamped at both ends', async () => {
    const { session, position } = setup()
    await session.start()
    session.next()
    session.next()
    session.next()
    expect(position.value).toBe(9)
    session.prev()
    expect(session.index.value).toBe(1)
    session.prev()
    session.prev()
    expect(position.value).toBe(3)
  })

  it('puts the view and tab back when it ends', async () => {
    const { session, view, tab } = setup()
    await session.start()
    session.end()
    expect(session.active.value).toBe(false)
    expect(view.value).toBe('3d')
    expect(tab.value).toBe('script')
  })

  it('ends when a new Run replaces the Trace', async () => {
    const { session, trace } = setup()
    await session.start()
    trace.value = traceB
    await nextTick()
    expect(session.active.value).toBe(false)
  })

  it('follows the playhead onto a step it did not move to itself', async () => {
    const { session, position } = setup()
    await session.start()
    position.value = 9
    await nextTick()
    expect(session.index.value).toBe(2)
  })

  it('reports empty when no step fits, and error when loading fails', async () => {
    const empty = setup([])
    await empty.session.start()
    expect(empty.session.status.value).toBe('empty')

    const failing = setup()
    failing.loadSteps.mockRejectedValueOnce(new Error('boom'))
    await failing.session.start()
    await flushPromises()
    expect(failing.session.status.value).toBe('error')
  })

  it('retries the same Trace after a failure without running again', async () => {
    const { session, position, ensureRun, loadSteps } = setup()
    loadSteps.mockRejectedValueOnce(new Error('no key'))
    await session.start()
    expect(session.status.value).toBe('error')
    await session.retry()
    expect(session.status.value).toBe('ready')
    expect(position.value).toBe(3)
    expect(ensureRun).toHaveBeenCalledTimes(1)
  })
})
