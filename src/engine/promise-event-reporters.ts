import type * as E from '@engine262/engine262'
import type { FrameInfo } from '../host/engine-adapter'
import type { Frame } from './engine262-types'
import type { EngineRunState } from './engine-run-state'

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

  const reportAwaitEvent = (event: E.AwaitEvent) => {
    if (state.hostDepth) return
    const fid = frameInfo(event.context as unknown as Frame).frameId
    if (event.type === 'suspend') {
      state.hooks.onAwaitEvent({ type: 'suspend', fid, awaitedPid: promiseId(event.promise) })
    } else state.hooks.onAwaitEvent({ type: 'resume', fid, mode: event.mode })
  }

  let generatorCounter = 0
  const generatorIds = new WeakMap<object, string>()
  const reportAsyncGeneratorEvent = (event: E.AsyncGeneratorEvent) => {
    if (state.hostDepth) return
    let gid = generatorIds.get(event.generator)
    if (!gid) generatorIds.set(event.generator, (gid = `g${++generatorCounter}`))
    state.hooks.onAsyncGeneratorEvent({ type: event.type, gid })
  }

  return { promiseId, reportPromiseEvent, reportAwaitEvent, reportAsyncGeneratorEvent }
}
