import type { CallbackInfo } from '../trace/trace-event'
import type { StackFrame } from './replay-state'

/**
 * The callback of the Task or Job that is running, followed from its start to the pop of its
 * stack frame. The chip for it sits on the running row until `frameId` is known, then on that
 * frame, then nowhere (`done`). Values are replaced, never mutated: snapshots share them.
 */
export interface RunningCallback {
  /** The Task or Job id: also the id of the callback's chip. */
  chipId: string
  owner: 'task' | 'job'
  callback: CallbackInfo
  /** Frame the callback runs in; null until it is pushed. */
  frameId: string | null
  /** The job root frame (labelled `script`, not the callback) has been pushed. */
  rootSeen: boolean
  done: boolean
}

/** A Task or Job with no descriptor (the Script, rejection notifications) has no chip to follow. */
export function beginCallback(
  owner: RunningCallback['owner'],
  chipId: string,
  callback: CallbackInfo | undefined,
): RunningCallback | null {
  return callback ? { chipId, owner, callback, frameId: null, rootSeen: false, done: false } : null
}

/**
 * Every Task and Job opens with a root frame that is not the callback. After it, a function or
 * await callback is the next user frame (built-in closures such as `fulfilledClosure` come
 * first and are skipped); a built-in callback is the next frame of any kind.
 */
export function onFramePush(
  current: RunningCallback | null,
  frame: Pick<StackFrame, 'frameId' | 'builtin'>,
): RunningCallback | null {
  if (!current || current.done || current.frameId !== null) return current
  if (!current.rootSeen) return frame.builtin ? current : { ...current, rootSeen: true }
  if (current.callback.kind === 'builtin' || !frame.builtin) return { ...current, frameId: frame.frameId }
  return current
}

/** The callback is over once its frame is off the stack (a throw unwinds several frames at once). */
export function onFramePop(
  current: RunningCallback | null,
  stackAfterPop: readonly StackFrame[],
): RunningCallback | null {
  if (!current || current.done || current.frameId === null) return current
  return stackAfterPop.some((f) => f.frameId === current.frameId) ? current : { ...current, done: true }
}
