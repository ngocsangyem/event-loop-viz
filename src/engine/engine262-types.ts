// Type aliases over engine262 shared by the adapter's sibling modules (ADR-0001, ADR-0005).
import * as E from '@engine262/engine262'

export type EngineValue = E.Value
export type NativeSteps = Parameters<typeof E.CreateBuiltinFunction.from>[0]
export type EngineJob = Parameters<InstanceType<typeof E.BasicJobQueue>['enqueuePromiseJob']>[0]
export type NativeGenerator = (...args: EngineValue[]) => Generator<unknown, unknown, unknown>

/** The execution-context shape this adapter reads; engine262 does not export a precise type. */
export interface Frame {
  Function: EngineValue
  callSite: { getFunctionName(): string | null; isNative(): boolean }
}
