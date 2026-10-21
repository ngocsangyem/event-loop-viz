# Code review: feat/callback-chip-panels (uncommitted)

Scope: `git diff HEAD` + untracked, excluding DESIGN.md, docs/design/, .claude/launch.json.
Checks run: `vitest run` 553 pass / 4 skipped; `vue-tsc --build` clean; `oxlint .` clean.
Probes (throwaway tests, deleted): await site, eval mislocation, duplicate-function timers, clearTimeout before due.

No Critical or High defects found. 1 Medium, 5 Low.

## Medium

### M1. Await-continuation chip points at the wrong line/text (stale `lastLoc`)
- `src/engine/promise-event-reporters.ts:41-45` (`currentSite`), `src/engine/engine262-adapter.ts:70-80` (`state.lastLoc = loc`)
- `onNodeEvaluation` fires at the START of each node (engine262.mjs:4086), so `lastLoc` at the suspend event is the last node evaluated anywhere, i.e. inside the awaited operand's execution, not the `await` expression.
- Verified: Script `function g(){\n let a=1\n let b=2\n return Promise.resolve(a+b)\n}\nasync function f(){\n await g()\n}\nf()` gives job:enqueue callback `{kind:'await', name:'f', line:4, text:'b'}` (line 4 inside `g`); the await is on line 7.
- Same for a pending-promise await (`await new Promise(r => setTimeout(r,1))` on multi-line executors): site lands in the executor. Existing tests pass only because operands are single-line (`await null`, `await Promise.resolve()`).
- Impact: tooltip says "line N" for the wrong line; `loc` is also what the cause-highlight / chip full text uses.
- Fix: in `onNodeEvaluation`, when `node.type === 'AwaitExpression'` record its loc per async context (e.g. `awaitLocByContext` keyed by `agent.runningExecutionContext`, or a stack popped on suspend), and have `currentSite` read that instead of `state.lastLoc`. Add a test with a multi-line sync operand.

## Low

### L1. Single-step detection recomputes `stateAt(from)` per hop; runs on every position change
- `src/renderer/panels/chip-step-detection.ts:24-32`, `sameView` in `src/App.vue:~110-113` (`panelSignature(stateAt(from)) === panelSignature(stateAt(to))`).
- `isSingleStep` runs on every `position` change (autoplay tick, scrubber drag). It walks up to 200 hops; each hop = 2 `stateAt` (snapshot clone + up to SNAPSHOT_INTERVAL events) + 2 `JSON.stringify`. `player.next` is also a linear `find`. `from`'s signature is identical every hop. Playback already does this same walk (use-playback.ts:66-67), so it is doubled. Only bites on long runs of identical-looking steps (e.g. many hidden-event steps), so Low.
- Fix: memoize the `from` signature inside the `sameView` closure (or pass a `signatureAt` cache keyed by position) and/or share the result with use-playback.

### L2. `onMove` is fire-and-forget with no error boundary; `snapping` can stick `true`
- `src/renderer/panels/use-chip-travel.ts:76-82` (`snapping.value = !single`), watcher at ~124 uses `void onMove(...)`.
- If `stateAt`/`chipsOf`/`flyChip` throws after `snapping` was set, the promise rejects unhandled and lists lose their transitions (`queue-snap`) until the next successful move. No concrete throw path found, defensive only.
- Fix: wrap body in try/catch/finally that resets `snapping` when `mine === generation`.

### L3. Duplicate chip ids in DOM while `queue-snap` rows leave; DEV warning spam and pulses on dying elements
- `src/renderer/panels/use-chip-travel.ts:33-41` skips only `.queue-item-leave-active`; on a jump, lists use `name="queue-snap"` (queue-list.vue `transitionName`, web-apis-panel.vue), so leaving rows carry `queue-snap-leave-active` (Vue removes them after ~2 rAF) and are not skipped. `found.set(id, el)` last-in-DOM wins, so `pulseChip` can land on the departing element, and the DEV `console.warn` fires on every jump that moves a chip.
- Fix: skip `[class*="-leave-active"]` (or `.queue-snap-leave-active` too).

### L4. `lastIndexOf` mislocates eval / new Function code that textually appears in the Script
- `src/engine/describe-callback.ts:46-52`. `ECMAScriptCode.location.startIndex` is relative to the eval'd source, but is used as an index into the Script.
- Verified: `setTimeout(eval("(function f(){ return 1 })"), 0)` yields a chip with loc on line 1 inside the earlier string literal, not "builtin". Harmless visually (text is right) but loc is wrong and any cause-highlight lands on the string literal.
- Fix: distinguish eval code, e.g. compare `ECMAScriptCode` source/`scriptOrModule`/realm source specifier to `user.js`, or verify `source.slice(start, start+len) === text` AND that the function's script record is the user Script.

### L5. `chipText` collapses the whole function text before cutting
- `src/renderer/panels/callback-chip-model.ts:~76-80`: `collapse(source.slice(start,end))` is O(function length) and runs per chip, in up to 5 `chipsOf` computeds per render (4 panels + travel x2 per move). A Script that is one big wrapper function used as a callback makes each step O(5 x size).
- Fix: slice to a bounded window first (`source.slice(start, Math.min(end, start + MAX_FULL_CHARS * 4))`) before collapse; or compute `chipsOf` once in App and pass down.

### L6. `refreshNextUnqueuedDue` is O(timers) on every init/clear/fire
- `src/host/timer-scheduler.ts:63-67` + callers at 59, 77, 112. Quadratic for scripts that arm many timers (50k timers => ~1e9). `next()` already sorts all timers per Task (pre-existing), so overall shape is unchanged; only worth fixing if a timer-flood example is expected. Fix: min-heap keyed (dueUs, order) for unqueued timers.

## Housekeeping
- Files over 200 lines: `src/App.vue` 236, `src/trace/trace-event-schema.ts` 212, `src/host/event-loop-host.ts` 203 (host grew by ~10 lines in this change; `drainTasks` / header building could move out).
- No plan-phase/finding-code references found in code comments or file names (grep of changed + untracked src/e2e).
- Dead-ish: `ctx.taskQueueSeq` is now only needed for port-message `task:begin` cause (event-loop-host.ts:~173); timers no longer read it. Not wrong, just narrower than its doc.
- `chipsOf` includes timers beyond the 6 rendered cards (`MAX_WEB_API_CARDS`), so hidden timers count toward `tooMany` (chip-travel-plan.ts) and can suppress flights for visible ones when many timers exist.

## Verified OK (no action)
- Timer model: `queueDue` sorts by (dueUs, arm order); fires at jump (`event-loop-host.ts:165-166`) and per node (`engine-event-hooks.ts:42`); fast path `nowUs < nextUnqueuedDueUs` is O(1). Probe: `clearTimeout` before due emits only `timer:clear`, no stray `task:queue`; `clearTimeout` after queued is handled in replay (`apply-event.ts` timer:clear filters `tasks` by tid). Interval re-arm gets a fresh taskId each time, so chip ids stay unique; timer id vs job id namespaces (`task-N` / `job-N`) cannot collide. Busy-wait: timers queue mid-loop in due order with `clock.loc` cleared and restored in `finally`.
- Message vs timer tie-break (`enqueuedBefore`: dueUs then order) stays consistent with the Task Queue display order because a timer is queued the instant it is due; no divergence found.
- v1 compatibility is moot: `validateTraceHeader` rejects schemaVersion != 2 and is used only in tests; Traces are never loaded from disk/URL (share links carry Script text only). Replay code tolerates missing `taskId`/`tid`/`callback` anyway.
- `.finally` unwrapping: `HostCapturedValues` is set only by `thenFinally`/`catchFinally` in engine262 (engine262.mjs:69756, 69803) and by iterator closures that are never promise handlers, so `captured[0]` heuristic is accurate. Bound functions and `Promise.resolve(fn).finally` (valueThunk) probed: correct.
- `lastIndexOf(text, bodyStart)` is correct for duplicated function text in the Script (probe: two `setTimeout(a,0)`, and identical arrows).
- Security: no `v-html` in the new code (only the pre-existing trusted `iso-raw.vue`). Chip text rendered via mustache; tooltip/aria-label via Vue attribute binding (escaped); vue-i18n params are interpolated as values, not re-parsed (`{kind}: {code}`). Ghost strips id, data-testid, data-chip-id, role, aria-label, title; overlay is `aria-hidden` and `pointer-events-none`.
- Animation lifecycle: `finish()` is synchronous and cancels ghost + hide animation; superseding moves bump `generation` and bail after `await nextTick`; `onScopeDispose` ends flights; `Promise.allSettled` absorbs cancel rejections; reduced-motion disables flights and pulses; `await nextTick()` inside a pre-flush job resolves after the render flush, so the post-patch rects are right.
- `runningCallback` is replaced, never mutated (snapshot-safe); `cloneReplayState` spread copies the reference.

## Unresolved questions
1. Is the Chrome oracle meant to cover the "queued at due time" ordering (equal-delay siblings, timer vs port message at the same instant)? The tie-break uses arm order, whereas Blink assigns the enqueue order when a delayed task becomes ready; no counter-example found in this model, but no oracle test pins it.
2. Should the await chip's `loc` be the `await` keyword/expression or the whole statement? Needed to pick the fix for M1.
3. Is a timer-flood example (>10k timers) in scope? Decides whether L6 matters.
