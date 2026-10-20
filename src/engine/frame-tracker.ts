import * as E from '@engine262/engine262'
import type { FrameInfo } from '../host/engine-adapter'
import type { Frame } from './engine262-types'
import type { EngineRunState } from './engine-run-state'

/** Stable per-Run ids and labels for engine execution contexts, and the stack observer that reports them. */
export function createFrameTracker(state: EngineRunState) {
  let frameCounter = 0
  const frameIds = new WeakMap<object, FrameInfo>()

  /** Real function name; host built-ins carry it as a `name` property, not on the call site. */
  const frameLabel = (frame: Frame): { label: string; builtin: boolean } => {
    const fn = frame.Function
    if (!(fn instanceof E.ObjectValue)) return { label: 'script', builtin: false }
    const nameProp = fn.properties.get(E.Value('name'))
    const named = nameProp?.Value
    const label =
      named instanceof E.JSStringValue && named.stringValue()
        ? named.stringValue()
        : frame.callSite.getFunctionName() || '(anonymous)'
    return { label, builtin: frame.callSite.isNative() }
  }

  const frameInfo = (frame: Frame): FrameInfo => {
    let info = frameIds.get(frame)
    if (!info) {
      info = { frameId: `frame-${++frameCounter}`, ...frameLabel(frame) }
      frameIds.set(frame, info)
    }
    return info
  }

  /** Observes the agent's execution-context stack on this instance and reports push / pop. */
  function observeStack(agent: InstanceType<typeof E.Agent>) {
    const stack = agent.executionContextStack as unknown as {
      push(ctx: Frame): number
      pop(ctx: Frame): void
    }
    const originalPush = stack.push
    const originalPop = Object.getPrototypeOf(stack).pop as (ctx: Frame) => void
    stack.push = function (ctx) {
      const result = originalPush.call(this, ctx)
      if (!state.hostDepth) state.hooks.onFramePush(frameInfo(ctx))
      return result
    }
    stack.pop = function (ctx) {
      originalPop.call(this, ctx)
      if (!state.hostDepth) state.hooks.onFramePop(frameInfo(ctx))
    }
  }

  return { frameInfo, observeStack }
}
