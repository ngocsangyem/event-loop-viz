import type * as E from '@engine262/engine262'
import type { FrameInfo } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { Frame } from './engine262-types'
import type { EngineRunState } from './engine-run-state'

/** Where an await continuation shows its pause: the async function and the line it paused at. */
export type AwaitSite = (context: object) => CallbackInfo

/**
 * Translates engine262's promise, await and async-generator callbacks into host hook calls,
 * assigning each promise and generator a stable per-Run id on first sight.
 */
export function createPromiseEventReporters(
  state: EngineRunState,
  frameInfo: (frame: Frame) => FrameInfo,
) {
  let promiseCounter = 0
  const promiseIds = new WeakMap<object, string>()
  /** Stable per-Run id of a promise; assigned on first sight. */
  const promiseId = (promise: object): string => {
    let id = promiseIds.get(promise)
    if (!id) promiseIds.set(promise, (id = `p${++promiseCounter}`))
    return id
  }

  const reportPromiseEvent = (event: E.PromiseEvent) => {
    const { hooks } = state
    const pid = promiseId(event.promise)
    if (event.type === 'create') hooks.onPromiseEvent({ type: 'create', pid })
    else if (event.type === 'reaction') {
      hooks.onPromiseEvent({ type: 'reaction', pid, via: event.via, pending: event.pending })
    } else if (event.type === 'resolve') hooks.onPromiseEvent({ type: 'resolve', pid, with: event.with })
    else hooks.onPromiseEvent({ type: 'settle', pid, state: event.state })
  }

  /** Pause sites of async functions currently parked at an await, keyed by their context. */
  const parkedSites = new WeakMap<object, CallbackInfo>()
  /**
   * The innermost `await` expression the context entered and has not paused at yet. Awaits that
   * have no expression (`for await`, async generators) fall back to the last evaluated node.
   */
  const currentSite = (context: object): CallbackInfo => {
    const pending = state.pendingAwaits.get(context)
    const loc = pending?.[pending.length - 1] ?? state.lastLoc
    return { kind: 'await', name: frameInfo(context as unknown as Frame).label, ...(loc && { loc }) }
  }
  /**
   * The continuation Job of an await is enqueued before the engine reports the suspend when the
   * awaited promise is already settled, so a context with no parked site is still on the node
   * it is pausing at and the current position is the right one.
   */
  const awaitSite: AwaitSite = (context) => parkedSites.get(context) ?? currentSite(context)
  /**
   * Async functions parked at an await. engine262 holds their context only in a JS closure of
   * the await's reaction handler, which `gc()` cannot see, so they are marked as roots.
   */
  const parkedContexts = new Set<object>()

  const reportAwaitEvent = (event: E.AwaitEvent) => {
    if (state.hostDepth) return
    const fid = frameInfo(event.context as unknown as Frame).frameId
    if (event.type === 'suspend') {
      parkedSites.set(event.context, currentSite(event.context))
      parkedContexts.add(event.context)
      // This await is now paused; an enclosing one (`await (await a)`) is next in line.
      state.pendingAwaits.get(event.context)?.pop()
      state.hooks.onAwaitEvent({ type: 'suspend', fid, awaitedPid: promiseId(event.promise) })
    } else {
      // The next await in this context must not reuse this pause site.
      parkedSites.delete(event.context)
      parkedContexts.delete(event.context)
      state.hooks.onAwaitEvent({ type: 'resume', fid, mode: event.mode })
    }
  }

  let generatorCounter = 0
  const generatorIds = new WeakMap<object, string>()
  const reportAsyncGeneratorEvent = (event: E.AsyncGeneratorEvent) => {
    if (state.hostDepth) return
    let gid = generatorIds.get(event.generator)
    if (!gid) generatorIds.set(event.generator, (gid = `g${++generatorCounter}`))
    state.hooks.onAsyncGeneratorEvent({ type: event.type, gid })
  }

  const markParked = (m: (value: unknown) => void) => parkedContexts.forEach(m)

  return { promiseId, awaitSite, reportPromiseEvent, reportAwaitEvent, reportAsyncGeneratorEvent, markParked }
}
