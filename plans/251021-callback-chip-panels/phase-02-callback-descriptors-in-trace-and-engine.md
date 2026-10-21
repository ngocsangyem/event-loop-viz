# Phase 2: callback descriptors in the Trace and engine plumbing

## Context links
- Schema: `src/trace/trace-event.ts:61-66` (task:queue), `:69-77` (job:enqueue), `:81-88` (timer:init); `src/trace/trace-event-schema.ts:50-61,69`.
- Seam: `src/host/engine-adapter.ts:10-12` (`CallbackHandle`), `:74` (`onJobEnqueue`, positional).
- Engine: `src/engine/realm-globals.ts:57-66` (timer handle), `:76-91` (queueMicrotask -> `enqueueTracked`), `:97-101` (`registerCallback`); `src/engine/reporting-job-queue.ts:14-23`; `src/engine/promise-job-descriptor.ts:21-32`; `src/engine/message-channel-global.ts:44-59`; `src/engine/promise-event-reporters.ts:33-39`; `src/engine/engine262-adapter.ts:21` (`ENGINE262_PATCH`), `:69-77` (`onNodeEvaluation`), `:89-108` (`evaluateScript`).
- Patch: `patches/@engine262__engine262.patch`. `reactionMeta` at `:206` (cjs) and `:468` (mjs). Thenable meta at `:280` and `:518`. `PromiseJobMeta` type at `:28`.
- engine262 internals (verified in `node_modules/@engine262/engine262/lib/engine262.mjs`):
  - `kAsyncContext` is a module-private symbol (`:1740`), set on the await closures (`:29364,:29378`). It cannot be read outside the module without the patch.
  - `.finally` closures carry `HostCapturedValues = [onFinally]` (`:69753,:69800`), so no patch is needed for them.
  - ECMAScript functions have a `SourceText` string (`:43898`) and `ECMAScriptCode` (the body node, with `.location.startIndex`).
  - `hasSourceTextInternalSlot` is exported (`:43505`).

## Overview
Priority P2. Status: completed. Each queued Task or Job, and each pending timer, now says which function it will call, so the renderer can draw a chip. The Trace stores a source range, never the text itself.

## Key insights
- Text duplication: a `setInterval` with a long callback would repeat the text in every `timer:init`, and the events Budget allows 200k events (`src/trace/default-budgets.ts:8`). Storing `loc` into `header.source` costs O(1) per event. The text is `source.slice(start, end)`.
- Getting the function range: the adapter knows the Script source (passed to `evaluateScript`) and `fn.SourceText`. `start = source.lastIndexOf(fn.SourceText, fn.ECMAScriptCode.location.startIndex)`. This is exact because the real start is at or before the body start. If it is `-1` (eval / `new Function` code), use `{kind:'builtin', name}` or no descriptor. Cache the result per function in a WeakMap.
- Await continuations have no function of their own. Descriptor: `{kind:'await', name: <async fn frame label>, loc: <loc of the last node evaluated before the suspend>}`. The adapter records it at `await:suspend` (WeakMap keyed by the async context) and reads it back through `meta.asyncContext` when the continuation Job is enqueued.
- Built-in handlers: `.then(console.log)` gives `{kind:'builtin', name:'log'}`. A native thenable `then` gives `{kind:'builtin', name:'then'}`. Promise.all element functions, async-from-sync and async-generator closures have empty names, so they get no descriptor and the renderer keeps its generic label.
- Port messages: the delivered function is the built-in "MessagePort message dispatch". The chip shows `port.handler` as it is when the delivery is scheduled. With no handler yet (`start()` was called before `onmessage` was set) there is no descriptor.
- Chip identity for a timer: the host already assigns `taskId` at init (`timer-scheduler.ts:45`). Exposing it on `timer:init` lets the Web APIs card and the queue row share one id. An interval re-armed at fire gets a new taskId, so each repeat is a new chip.

## Requirements
- Functional: `timer:init {taskId, callback?}`, `task:queue {callback?}` (timer and port-message), and `job:enqueue {callback?}` for reaction, thenable and microtask Jobs.
- Non-functional: `src/host` imports no engine types (`import-boundaries.test.ts`). The patch still applies through `pnpm install --frozen-lockfile`. Trace events stay JSON-serializable.

## Architecture / data flow
```ts
// src/trace/trace-event.ts
/** A function a Task or Job will call, for display. `loc` indexes into header.source. */
export interface CallbackInfo {
  kind: 'function' | 'await' | 'builtin'
  /** function: the whole function text; await: the node it paused at */
  loc?: SourceLocation
  /** await: the async function's name; builtin: the built-in's name */
  name?: string
}
```
```
engine: describeFunction(fn) -> CallbackInfo | undefined          (new describe-callback.ts)
  timers: handle = {__callbackHandle, info: describe(cb)} -> host setTimer -> PendingTimer.info
          -> timer:init {taskId, callback: info}; queueDue -> task:queue {callback: info}
  port:   registerCallback(dispatchFn, describe(port.handler)) -> enqueuePortMessage(handle)
          -> task:queue {callback: handle.info}
  jobs:   patch meta {handler, asyncContext} | {then} -> promiseJobDescriptor(...).callback
          queueMicrotask: enqueueTracked({..., callback: describe(fn)})
          -> hooks.onJobEnqueue({jobId, jobKind, pid, outcome, callback}) -> job:enqueue {callback}
  await:  reportAwaitEvent(suspend) -> awaitSites.set(context, {name: frame label, loc: lastLoc})
```
Patch changes (in both the `lib/engine262.js` and `lib/engine262.mjs` hunks):
- `reactionMeta(promise, reaction)` adds `handler: reaction.Handler ? reaction.Handler.Callback : undefined` and `asyncContext: reaction.Handler ? reaction.Handler.Callback[kAsyncContext] : undefined`. Check whether an empty Handler is `undefined` or a sentinel.
- Thenable meta adds `then: thenAction`.
- `declaration/execution-context/Job.d.mts`: extend `PromiseJobMeta`.
- Bump `ENGINE262_PATCH` to `'promise-events-4'` (`engine262-adapter.ts:21`).

## Related code files
Create:
- `src/engine/describe-callback.ts`: `createCallbackDescriber(state)` returns `describe(fn)`. It unwraps bound functions (`BoundTargetFunction`) and `.finally` closures (a built-in with `HostCapturedValues[0]` that is itself an ECMAScript function). Also holds the function-range lookup and the WeakMap cache. Under 80 lines.

Modify:
- `src/trace/trace-event.ts`: `CallbackInfo`; `timer:init.taskId`, `timer:init.callback?`; `task:queue.callback?`; `job:enqueue.callback?`.
- `src/trace/trace-event-schema.ts`: `const callback = opt(obj({kind: oneOf('function','await','builtin'), loc: opt(obj({start,end,line,column})), name: opt(str)}))`. Check that `obj` validates nested optional fields. If it does not, extend `FieldSpec` handling.
- `tests/golden/trace-schema-v2.json`: regenerate (v2 is still unreleased on this branch).
- `src/host/engine-adapter.ts`: `CallbackHandle.info?: CallbackInfo`. `onJobEnqueue(job: {jobId, jobKind, pid?, outcome?, callback?})` takes an object, so there is no 5th positional argument.
- `src/host/engine-event-hooks.ts:64-80`: object param; spread `callback`.
- `src/host/timer-scheduler.ts`: `timer:init` gets `taskId` and `callback`. `queueDue` copies `callback`. Allocate `taskId` before emitting `timer:init`.
- `src/host/event-loop-host.ts:62-66`: `callback: deliver.info` on the port `task:queue`.
- `src/engine/engine-run-state.ts`: add `source: string` and `lastLoc` (set in `onNodeEvaluation` when `!hostDepth`).
- `src/engine/engine262-adapter.ts`: store `state.source` in `evaluateScript`; update `lastLoc`; build the describer; pass it to globals, the job queue and the reporters; bump the patch id.
- `src/engine/realm-globals.ts`: the timer handle gets `info`; queueMicrotask passes `describe(fn)`; `registerCallback(fn, info)`.
- `src/engine/message-channel-global.ts`: `MessageChannelDeps.registerCallback(fn, info?)` and `describe(fn)`; `scheduleDelivery` passes `deps.describe(port.handler)`.
- `src/engine/reporting-job-queue.ts`: `enqueueTracked(job, {jobKind, pid?, outcome?, callback?})`.
- `src/engine/promise-job-descriptor.ts`: meta type gets `handler?`, `asyncContext?` and `then?`. `promiseJobDescriptor(job, promiseId, describe, awaitSite)` returns `callback`.
- `src/engine/promise-event-reporters.ts`: `awaitSites` WeakMap, filled on suspend with `frameInfo(context).label` and `state.lastLoc`. Export `awaitSite(context)`.
- `patches/@engine262__engine262.patch`: regenerate with `pnpm patch @engine262/engine262`, edit, then `pnpm patch-commit <dir>`. Review the `pnpm-lock.yaml` patch hash change.
- `src/runner/__tests__/job-kinds-ticks-and-golden.test.ts:157-159`: leave `callback` out of `project()` so the existing golden stays as it is. Descriptors are tested separately.

## Existing tests that break and why
| Test | Why | Fix |
|---|---|---|
| `job-kinds-ticks-and-golden.test.ts` golden | `project()` prints every job:enqueue field, so the new `callback` object shows up | Exclude `callback` in `project()` |
| `trace-schema.test.ts` | New fields | Regenerate the v2 snapshot |
| `trace-schema-conformance.test.ts` | New fields must be in the schema table | Passes once the schema is updated |
| `import-boundaries.test.ts` | Only if `CallbackInfo` is imported from the wrong place | Host imports it from `../trace/trace-event` |
`await-suspend-resume` and `async-generator-events` project a fixed set of keys, so they are unaffected. The oracle is unaffected: nothing observable changes.

## Implementation steps
1. Add the trace types and schema; regenerate the snapshot.
2. Seam changes in host (`CallbackHandle.info`, `onJobEnqueue` object), with the host wiring and the timer `taskId` on init.
3. Engine: run state `source` and `lastLoc`, `describe-callback.ts`, globals, MessageChannel, job queue.
4. Patch: extend `reactionMeta` and the thenable meta. Regenerate the patch. Run `pnpm install --frozen-lockfile` to prove it reapplies. Bump `ENGINE262_PATCH`.
5. Await sites in promise-event-reporters, and await descriptors in promise-job-descriptor.
6. New tests `src/runner/__tests__/callback-descriptors.test.ts`, one per kind, each checking `source.slice(loc.start, loc.end)`:
   - timeout arrow
   - named function declaration passed by name
   - bound function
   - setInterval repeats get distinct taskIds
   - queueMicrotask
   - `.then` and `.catch`
   - `.finally` (shows the onFinally text)
   - `.then()` with no handler (no callback)
   - await: `kind:'await'`, the function name, and the loc on the await's line
   - user thenable (the `then` method text)
   - native thenable (builtin `then`)
   - `.then(console.log)` (builtin `log`)
   - port message with a handler, and with `start()` called before `onmessage` (no callback)
   - a function created by eval (fallback)
7. Gates: type-check, vitest, oracle, `pnpm run build-only && pnpm run check:build`.

## Todo list
- [x] CallbackInfo type and schema fields, snapshot
- [x] seam: handle.info, onJobEnqueue object
- [x] describe-callback.ts
- [x] realm-globals, message-channel-global, reporting-job-queue, promise-job-descriptor
- [x] await sites
- [x] patch extended and regenerated, ENGINE262_PATCH bumped
- [x] callback-descriptors tests; golden projection excludes callback
- [x] all gates green

## Success criteria
Every `timer:init`, timer or port `task:queue`, and `job:enqueue` whose handler is user code carries a `callback` whose sliced text equals the function's source text. Verified by `callback-descriptors.test.ts`. The Observable Output of all oracle fixtures is unchanged.

## Risks
| Risk | L x I | Mitigation |
|---|---|---|
| Patch drift or a bad regeneration breaks install | M x H | Use only the `pnpm patch` flow. CI runs `--frozen-lockfile`. Keep the edit to 2 small functions. |
| `lastIndexOf` matches the wrong copy of identical text | L x L | Only a self-overlapping text could do this, and the shown text would still be correct |
| `HostCapturedValues` unwrap catches a non-finally built-in | L x L | Unwrap only when `[0]` is an ECMAScript function and the built-in's name is `''` |
| The await `lastLoc` is on the operand, not on `await` | M x L | Only the line is shown. A multi-line operand may point one line off. Accepted. |
| `state.source` is missing for host-created functions | L x L | `describe` returns undefined, and the renderer shows the generic label |

## Security
The text comes from the user's own Script. The renderer must insert it as text, never as HTML (Vue's `{{ }}` does this). This is enforced in phase 3.

## Next steps
Phase 3 folds these fields into ReplayState and renders them.

## Unresolved questions
- Should the `name` of a builtin callback be prefixed (`console.log` vs `log`)? Planned: the renderer adds `console.` for console methods, reusing `call-stack-panel.vue:14-17`.
