import * as E from '@engine262/engine262'
import type { CallbackInfo, SourceLocation } from '../trace/trace-event'
import type { EngineValue } from './engine262-types'
import type { EngineRunState } from './engine-run-state'

/** The slots of an engine262 function object this module reads; the package has no precise type for them. */
interface FunctionSlots {
  SourceText?: string
  ECMAScriptCode?: SyntaxNode
  BoundTargetFunction?: EngineValue
  HostCapturedValues?: unknown[]
}

interface SyntaxNode {
  location: { startIndex: number }
  parent?: SyntaxNode
}

/** The topmost syntax node of the source a function was parsed from. */
function rootOf(node: SyntaxNode): SyntaxNode {
  let root = node
  while (root.parent) root = root.parent
  return root
}

/** 1-based line and column of `offset` in `source`, the convention of every other location in the Trace. */
function locate(source: string, offset: number): Pick<SourceLocation, 'line' | 'column'> {
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1
  let line = 1
  for (let i = source.indexOf('\n'); i !== -1 && i < offset; i = source.indexOf('\n', i + 1)) line++
  return { line, column: offset - lineStart + 1 }
}

const nameOf = (fn: InstanceType<typeof E.ObjectValue>): string => {
  const name = fn.properties.get(E.Value('name'))?.Value
  return name instanceof E.JSStringValue ? name.stringValue() : ''
}

/**
 * Builds `describe(fn)`: what a Task or Job that calls `fn` should show. A user function is a
 * range of the Script (the Trace never copies function text); a built-in is its name; anything
 * else (bare values, host-made helpers with no name) gets no descriptor.
 */
export function createCallbackDescriber(state: EngineRunState) {
  const cache = new WeakMap<object, CallbackInfo | undefined>()

  const compute = (fn: InstanceType<typeof E.ObjectValue>): CallbackInfo | undefined => {
    const slots = fn as unknown as FunctionSlots
    // A bound function runs its target; a promise `.finally` closure is an unnamed built-in
    // whose first captured value is the user's onFinally callback.
    if (slots.BoundTargetFunction) return describe(slots.BoundTargetFunction)
    const name = nameOf(fn)
    const captured = slots.HostCapturedValues?.[0]
    if (!name && captured !== undefined) return describe(captured as EngineValue)

    const text = slots.SourceText
    if (typeof text === 'string' && state.source !== undefined) {
      const code = slots.ECMAScriptCode
      // Code from eval / new Function has offsets of its own source, which may even repeat text
      // that is in the Script: only a function parsed from the Script itself has a range in it.
      if (code && rootOf(code) !== state.scriptRoot) return name ? { kind: 'builtin', name } : undefined
      const bodyStart = code?.location.startIndex
      // The function starts at or before its body, so the last copy of its text up to the
      // body start is this function's own, even when identical text appears earlier.
      const start = bodyStart === undefined ? state.source.indexOf(text) : state.source.lastIndexOf(text, bodyStart)
      if (start !== -1) {
        return { kind: 'function', loc: { start, end: start + text.length, ...locate(state.source, start) } }
      }
      return name ? { kind: 'builtin', name } : undefined
    }
    return name ? { kind: 'builtin', name } : undefined
  }

  function describe(fn: EngineValue | undefined): CallbackInfo | undefined {
    if (!(fn instanceof E.ObjectValue) || !E.isFunctionObject(fn)) return undefined
    if (cache.has(fn)) return cache.get(fn)
    const info = compute(fn)
    cache.set(fn, info)
    return info
  }

  return describe
}

export type DescribeCallback = ReturnType<typeof createCallbackDescriber>
