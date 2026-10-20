# JavaScript Event Loop Semantics: Spec + Chrome Ground Truth

Scope: exact event-loop semantics for the event-loop visualizer (Vue 3). Goal: match current Chrome.
Language: English (per coordinator instruction).

## 0. Versions and Method

| Item | Value |
|---|---|
| Chrome (empirical oracle) | 155.0.8059.85 (`/Applications/Google Chrome.app`, driven by playwright-core 1.63.0) |
| Node (cross-check, microtasks only) | 20.20.2 (V8 11.3), 24.16.0 (V8 13.6), 26.8.1 (V8 14.6) |
| ECMA-262 | current draft, https://tc39.es/ecma262/ (fetched 2026-10-21) |
| HTML | Living Standard, "Last Updated 20 October 2026" |
| test262 | commit `d53ebc8` (2026-10-13), sparse checkout |

Method:
- Spec text read from the raw HTML of each spec, not from memory.
- Each case is a snippet run in Chrome (headless and headed) and Node 20/24/26.
- Tick counts measured with a self-requeueing probe. `n` = tick index. Baseline `await nativePromise` = 1.
- Timer cases run from a posted-message task (nesting level 0). Probes started inside timer callbacks are contaminated by the nesting clamp (see Section 4.9).
- Harness and raw outputs live in scratch, not in the repo.

Spec-derived vs verified: every case in Section 4 is marked **[verified]** (matched Chrome) with Chrome output. Only the rAF-vs-timer interleave is **not verified** (Section 4.14).

## 1. Summary

- Pure microtask semantics (ES-level) are fully deterministic. Chrome 155 and Node 20/24/26 agree on every tick count.
- `await` costs 1 tick for a native promise, 1 tick for a non-promise, 2 ticks for a thenable. Pre-ES2019 cost was 3 ticks for a native promise (emulated).
- `return p` in an async function costs 3 ticks. `return await p` costs 2. The spec change that would make `return p` cost 2 (PR #2772) is **open**, not merged. Chrome 155 = spec today.
- Chrome's host-defined ordering differs from Node: `setTimeout(0)` fires before `unhandledrejection`; `setTimeout(0)` vs `MessageChannel` follows registration order (Node: message always first); `setTimeout(0)` vs `setTimeout(1)` is not equivalent in spec terms, and Chrome fires 0 first.
- HTML timer nesting clamp is implemented exactly as spec: timers 1-6 nested run at ~0 / ~1.2ms; timer 7 onward is clamped to ~4.5ms.
- Node does not implement the HTML 4ms clamp. Do not use Node as oracle for timers.

## 2. Sources and Credibility

| Source | Type | Weight |
|---|---|---|
| ECMA-262 draft (tc39.es) | Normative spec | Highest |
| HTML Living Standard (whatwg) | Normative spec | Highest |
| tc39/ecma262 PRs and issues (#1250, #2770, #2772, #2819) | Editor/champion record, primary | High |
| test262 (tc39/test262) | Conformance suite, maintainers | High |
| Chrome 155 runtime (empirical) | Ground truth for "current Chrome" | Highest for host-defined behavior |
| Node 20/24/26 runtime | Engine cross-check | Medium (Node is not Chrome; no HTML host) |

Not used: blogs, MDN, StackOverflow, javascript.info (per instructions).

## 3. Event Model (what the visualizer must emit)

Each event carries a spec reference. The model is a minimal superset: the 17 kinds below.

| # | Event kind | Definition (spec step) |
|---|---|---|
| 1 | `task:queue` {taskId, source, dueMs?, nesting} | Queue a global task (HTML 8.1.7.2). `source` is the task source (timer, posted-message, port-message, dom-manipulation, script, rendering). |
| 2 | `task:begin` / `task:end` {taskId} | Event loop runs `oldestTask` (HTML 8.1.7.3, processing model). |
| 3 | `checkpoint:begin` / `checkpoint:end` {reason} | Perform a microtask checkpoint (HTML 8.1.7.3). `reason`: `task-end`, `script-end` (clean up after running script, HTML 8.1.4.4), `callback-end` (clean up after running a callback). |
| 4 | `job:enqueue` {jobId, jobKind} | HostEnqueuePromiseJob (ES 9.5.5 -> HTML 8.1.6.6.4) or queue a microtask (HTML 8.1.7.2). `jobKind`: `reaction`, `thenable`, `microtask`. |
| 5 | `job:begin` / `job:end` {jobId} | Microtask dequeue + run inside a checkpoint (HTML 8.1.7.3). |
| 6 | `frame:push` / `frame:pop` {frameId, label} | Execution context stack push/pop (ES 9.4). |
| 7 | `promise:create` {pid} | Promise constructor / NewPromiseCapability (ES 27.5.3.1, 27.5.1.5). |
| 8 | `promise:reaction` {pid, via, pending} | PerformPromiseThen (ES 27.5.5.4.1). `pending: true` = append to reaction list; `false` = enqueue job immediately. `via`: `then`, `await`, `asyncgen`, `from-sync`. |
| 9 | `promise:resolve` {pid, with} | Promise Resolve Function (ES 27.5.1.3). `with`: `value`, `thenable`, `self`. `thenable` triggers event 10. |
| 10 | `promise:thenable-job` {pid, jobId} | NewPromiseResolveThenableJob (ES 27.5.2.2). Enqueued via event 4. |
| 11 | `promise:settle` {pid, state} | FulfillPromise / RejectPromise (ES 27.5.1.4 / 27.5.1.7). `state`: `fulfilled`, `rejected`. Triggers event 4 for each reaction (ES 27.5.1.8). |
| 12 | `await:suspend` / `await:resume` {fid, awaitedPid, mode} | Await (ES 27.10.5.3). `mode`: `next`, `throw`. |
| 13 | `asyncgen:yield` / `asyncgen:resume` / `asyncgen:return-await` {gid} | AsyncGeneratorYield (ES 27.9.3.8), AsyncGeneratorResume (27.9.3.6), ReturnStatement await in async generator (ES 14.10.1). |
| 14 | `timer:init` {tid, requestedMs, clampedMs, nesting, repeat} | Timer initialization steps (HTML 8.7). |
| 15 | `timer:fire` / `timer:clear` {tid} | Timer task run (HTML 8.7) / clearTimeout. |
| 16 | `rejection:track` {pid, op} | HostPromiseRejectionTracker (HTML 8.1.6.4 -> ES 27.5.1.9). `op`: `reject`, `handle`. |
| 17 | `rejection:notify` {pid, outcome} | Notify about rejected promises (HTML 8.1.4.7). `outcome`: `unhandled`, `handled-skip`. Dispatch is a queued DOM-manipulation task. |
| 18 | `exception:report` {origin, message} | Report an exception (HTML 8.1.4.6). `origin`: `microtask-callback`, `task-callback`, `script`. |
| 19 | `render:step` {phase} | Update the rendering (HTML 8.1.7.3). `phase`: `raf-callbacks`, `layout-paint`. |

Minimal TypeScript sketch:

```ts
type TaskSource = 'timer' | 'posted-message' | 'port-message' | 'dom-manipulation' | 'script' | 'rendering';
type SpecRef = `ES:${string}` | `HTML:${string}`;

interface Base { seq: number; t: number /* virtual ms */; ref: SpecRef }

type LoopEvent = Base & (
  | { k: 'task:queue'; taskId: string; source: TaskSource; dueMs?: number; nesting: number }
  | { k: 'task:begin' | 'task:end'; taskId: string }
  | { k: 'checkpoint:begin' | 'checkpoint:end'; reason: 'task-end' | 'script-end' | 'callback-end' }
  | { k: 'job:enqueue'; jobId: string; jobKind: 'reaction' | 'thenable' | 'microtask' }
  | { k: 'job:begin' | 'job:end'; jobId: string }
  | { k: 'frame:push' | 'frame:pop'; frameId: string; label: string }
  | { k: 'promise:create'; pid: string }
  | { k: 'promise:reaction'; pid: string; via: 'then' | 'await' | 'asyncgen' | 'from-sync'; pending: boolean }
  | { k: 'promise:resolve'; pid: string; with: 'value' | 'thenable' | 'self' }
  | { k: 'promise:thenable-job'; pid: string; jobId: string }
  | { k: 'promise:settle'; pid: string; state: 'fulfilled' | 'rejected' }
  | { k: 'await:suspend' | 'await:resume'; fid: string; awaitedPid?: string; mode?: 'next' | 'throw' }
  | { k: 'asyncgen:yield' | 'asyncgen:resume' | 'asyncgen:return-await'; gid: string }
  | { k: 'timer:init'; tid: string; requestedMs: number; clampedMs: number; nesting: number; repeat: boolean }
  | { k: 'timer:fire' | 'timer:clear'; tid: string }
  | { k: 'rejection:track'; pid: string; op: 'reject' | 'handle' }
  | { k: 'rejection:notify'; pid: string; outcome: 'unhandled' | 'handled-skip' }
  | { k: 'exception:report'; origin: 'microtask-callback' | 'task-callback' | 'script'; message: string }
  | { k: 'render:step'; phase: 'raf-callbacks' | 'layout-paint' }
);
```

Tick accounting for the visualizer: a "tick" is one FIFO round of the microtask queue. A job enqueued during round r runs in round r+1. Tick counts in Section 4 follow this definition.

## 4. Cases

Each case: spec trace, code, Chrome 155 output, and status. Output lines are exactly as printed in the runs.

### 4.1 Synchronous prefix of async functions [verified]

Spec: AsyncFunctionStart (ES 27.10.5.1) -> AsyncBlockStart (ES 27.10.5.2) runs the body synchronously until Await (ES 27.10.5.3), which returns to the caller via RunCallerContext.

```js
async function f() { console.log('f:1'); await null; console.log('f:2'); }
f(); console.log('after call');
```
Chrome 155: `f:1`, `after call`, `f:2`.

### 4.2 Await vs then-chain interleave [verified]

Spec: `await p` on a native promise registers a reaction immediately (ES 27.10.5.3 -> PerformPromiseThen, ES 27.5.5.4.1), so its job sits in the queue before `p.then(...)` jobs created later.

```js
async function f() { await Promise.resolve(); log('await'); }
f();
Promise.resolve().then(() => log('then1')).then(() => log('then2'));
```
Chrome 155: `await`, `then1`, `then2`. Matches test262 `language/expressions/await/async-await-interleaved.js`.

### 4.3 Await tick counts (ES2019 vs before) [verified]

Spec now (ES 27.10.5.3): `promise = PromiseResolve(%Promise%, arg)`. PromiseResolve returns `arg` unchanged if it is a native promise with matching constructor (ES 27.5.4.7.1). Before PR #1250 (merged 2019-02-26), Await wrapped every value in a new promise, which adds jobs for native promises.

| Awaited value | Trace | Spec ticks now | Chrome 155 `n` | Pre-ES2019 (emulated `new Promise(r=>r(v))`) |
|---|---|---|---|---|
| native promise (fulfilled) | PromiseResolve returns same promise; reaction job round 1 | 1 | 1 | 3 |
| non-promise `1` | PromiseResolve makes fulfilled promise; reaction job round 1 | 1 | 1 | 1 |
| thenable (`then` calls resolve sync) | round 1: NewPromiseResolveThenableJob calls `then`, fulfills P; reaction round 2 | 2 | 2 | - |
| rejected native promise | reaction round 1 (throw completion) | 1 | 1 | - |

Pre-ES2019 native case trace: wrapper P = new Promise; resolve(P, p) -> thenable job (round 1) -> `p.then(resolveP)` -> p is fulfilled, reaction (round 2) -> P fulfilled -> await reaction (round 3).

Code (native case):
```js
(async () => { await Promise.resolve(1); mark('await native'); })();
```
Chrome 155: `await native: n=1`. Thenable: `await { then(r){ r(1) } }` -> `n=2`. Legacy emulation -> `n=3`.

Monkey-patched `then` on a native promise is not called by await (test262 `await-monkey-patched-promise.js`).

### 4.4 `return promise` vs `return await promise` [verified; spec-conformant, open issue]

Spec: ReturnStatement only awaits inside async generators (ES 14.10.1: `If GetGeneratorKind() is async, set exprValue to ? Await(exprValue)`). In async functions, the result goes to AsyncBlockStart's `Call(promiseCapability.[[Resolve]], ...)` (ES 27.10.5.2) -> Promise Resolve Function (ES 27.5.1.3). An object with callable `then` takes NewPromiseResolveThenableJob (ES 27.5.2.2) -> one extra job, then the derived `then` reaction -> one more tick.

Trace for `return Promise.resolve(1)` (direct):
- Round 1: thenable job calls `P.then(resolveOuter, rejectOuter)`; P fulfilled -> reaction job enqueued.
- Round 2: resolveOuter(1) fulfills outer -> caller's `.then(mark)` reaction enqueued.
- Round 3: mark. **3 ticks.**

Trace for `return await Promise.resolve(1)`:
- Round 1: await reaction resumes; `return 1` resolves outer with a non-thenable -> fulfill.
- Round 2: mark. **2 ticks.**

Code:
```js
(async () => { return Promise.resolve(1); })().then(() => mark('return promise'));
(async () => { return await Promise.resolve(1); })().then(() => mark('return await promise'));
```
Chrome 155: `return promise (direct): n=3`, `return await promise: n=2`. Plain `return 1` -> `n=1`.

Spec status: tc39/ecma262 issue #2770 ("Direct return from async function takes too many ticks", open) reports the same 3 vs 2 gap. Fix proposal PR #2772 ("Remove Job from Promise Resolve Functions") is **OPEN**, not merged as of 2026-10-21. Once it merges, `return p` should drop to 2 ticks and `resolve(thenable)` to one fewer job. Visualizer tick rules must be data-driven so this can be switched.

### 4.5 Thenables and resolve(thenable) [verified]

Spec: the Promise Resolve Function reads `Get(resolution, "then")` synchronously (ES 27.5.1.3). Only the `then` call is deferred to a job (ES 27.5.2.2).

```js
new Promise(r => r({ get then() { log('then getter'); return (res) => res(1); } }));
log('after resolve');
```
Chrome 155: `then getter`, `after resolve` (getter sync, call deferred).

Ticks: `resolve(nativePromise)` = 3 (A11); `resolve(syncThenable)` = 2 (A12); `resolve(1)` = 1 (A13).

### 4.6 `Promise.resolve(p)` identity vs `new Promise(r => r(p))` [verified]

Spec: PromiseResolve (ES 27.5.4.7.1): if `IsPromise(resolution)` and `resolution.constructor === C`, return `resolution`. `new Promise(r => r(p))` always makes a new promise.

```js
const p = Promise.resolve(1);
log(Promise.resolve(p) === p);            // true
log(new Promise(r => r(p)) === p);        // false
```
Chrome 155: `true`, `false`. Ticks: `Promise.resolve(p).then` = 1; `new Promise(r=>r(p)).then` = 3.

### 4.7 Async generators: yield, next, and return [verified]

Spec: `yield v` in an async generator is `AsyncGeneratorYield(? Await(arg))` (ES 27.8.3.7). So a yielded value is awaited before the `next()` promise resolves. `next()` -> AsyncGeneratorEnqueue (ES 27.9.3.4) -> AsyncGeneratorResume (ES 27.9.3.6) when suspended. AsyncGeneratorCompleteStep resolves the request promise (ES 27.9.3.5).

```js
async function* g() { log('g:start'); yield Promise.resolve('v'); log('g:after-yield'); }
const it = g(); log('call next'); it.next().then(r => log('next resolved ' + r.value));
log('sync end');
```
Trace: `g:start` runs inside `next()`. The yield awaits (job, round 1). Round 1 completes AsyncGeneratorYield and resolves the next() promise -> `then` reaction (round 2). `g:after-yield` never runs (no second `next()`).

Chrome 155: `call next`, `g:start`, `sync end`, `next resolved v`.

`return` in async generator (ES 14.10.1 awaits the operand):

| Operand | Spec ticks | Chrome 155 `n` |
|---|---|---|
| `return 1` | Await round 1; CompleteStep resolves next() round 1; mark round 2 | 2 |
| `return Promise.resolve(1)` | same | 2 |
| `return thenable` (sync then) | +1 job | 3 |

for-await over async gen [verified]:
```js
async function* g() { log('g1'); yield 'a'; log('g2'); yield 'b'; }
(async () => { for await (const v of g()) log('loop ' + v); log('done'); })();
log('sync');
```
Chrome 155: `g1`, `sync`, `loop a`, `g2`, `loop b`, `done`. Matches test262 `for-await-of-interleaved.js` and `async-generator-interleaved.js` in shape.

for-await over sync iterable of promises: CreateAsyncFromSyncIterator (ES 27.1.5.1) and AsyncFromSyncIteratorContinuation (ES 27.1.5.4) wrap the value with PromiseResolve and PerformPromiseThen. First body = tick 2. Chrome 155: `n=2`.

Note: PR #2819 ("avoid mostly-redundant await in async yield*", merged 2022-12-10) changes `yield*` awaits. Not covered by my runs.

### 4.8 Errors in microtasks and unhandled rejections [verified]

**Throw in a `queueMicrotask` callback:** report an exception (HTML 8.1.4.6) fires an `error` event and does not stop the checkpoint. The loop in HTML 8.1.7.3 continues.

```js
queueMicrotask(() => { log('m1'); throw new Error('boom'); });
queueMicrotask(() => log('m2'));
Promise.resolve().then(() => log('m3'));
```
Chrome 155: `m1`, `error event: boom`, `m2`, `m3`.

**Throw in a `then` callback:** NewPromiseReactionJob catches the abrupt completion and rejects the derived promise (ES 27.5.2.1). No `error` event. HostPromiseRejectionTracker `reject` (ES 27.5.1.9 -> HTML 8.1.6.4) adds the promise to the about-to-be-notified list. After the checkpoint, notify about rejected promises (HTML 8.1.4.7) queues a DOM-manipulation task that fires `unhandledrejection` if still unhandled.

```js
Promise.resolve().then(() => { throw new Error('then-boom'); });
Promise.resolve().then(() => log('sibling microtask'));
```
Chrome 155: `sibling microtask`, `unhandledrejection: then-boom`.

**Unhandled rejection timing:**
- `Promise.reject(x); setTimeout(t50, 50); Promise.resolve().then(m)` -> `microtask`, `unhandledrejection: x1`, `timer 50`. [verified]
- Handler attached in a later timer -> `unhandledrejection: x2`, `attached`, `rejectionhandled`. The `handle` op removes the outstanding entry (HTML 8.1.6.4). [verified]
- Handler attached in a microtask of the same checkpoint -> no `unhandledrejection` (checked after the checkpoint). Chrome 155: `caught in microtask` only. [verified]
- **Host-defined ordering vs timer 0** (spec 8.1.7.3 picks task queue implementation-defined; DOM-manipulation task source is implementation-defined):
  - Chrome 155 (headless + headed, 3 cases F01-F03): `timeout0` **before** `unhandledrejection`.
  - Node 20/24/26: `unhandledrejection` before `timeout0`. Node is not Chrome.

### 4.9 Timers [verified]

Spec (HTML 8.7, timer initialization steps): if `nestingLevel > 5` and `timeout < 4` then `timeout = 4`. `nestingLevel` is the currently running task's timer nesting level, only when the running task was created by the timer algorithm; otherwise 0. The new task's nesting = nestingLevel + 1.

Ordering (HTML 8.7, run steps after a timeout): a timer waits until any earlier invocation with the **same orderingIdentifier and milliseconds <= its own** completes. So equal-delay timers keep order; a shorter delay may run first; there is no ordering rule between a `0` timer and an earlier `1` timer.

- `setTimeout(A,10); setTimeout(B,10); setTimeout(C,5)` -> Chrome 155: `C5`, `A10`, `B10`. [verified]
- `setTimeout(t1,1); setTimeout(t0,0)` -> Chrome 155: `t0`, `t1`. Node: `t1`, `t0` (Node clamps 0 to 1ms, insertion order). [verified; Node differs]
- `setTimeout(t0,0); setTimeout(t1,1)` -> Chrome 155: `t0`, `t1`. [verified]

**Nesting clamp, measured from a clean context (posted-message task, nesting 0):**

| Probe | Chrome 155 delta per call (ms) | Expected (spec) |
|---|---|---|
| single `setTimeout(f,0)` | 0.0-0.1 | not clamped |
| single `setTimeout(f,1)` | 1.1-1.3 | not clamped |
| chain `setTimeout(step,0)` x12 | `0.0 0.0 0.0 0.0 0.0 0.0 0.0 | 4.5 4.6 4.6 4.7 4.6` (clamp starts at 7th timer) | timers 1-6 ~0, timer 7+ >= 4 |
| chain `setTimeout(step,1)` x12 | `1.1-1.3` x6, then `4.6` | same rule |
| `setInterval(f,0)` | ~0 for first 5-6, then ~4.5 with jitter (3.4-3.7 seen) | repeats use the same nesting rule |

Node: no clamp (1.2ms for every call). Node is not an oracle for timers.

**Common trap (observed in my own first run):** probes started inside timer callbacks get clamped from the first call because nesting level grows. Always start measurements from a posted-message task.

### 4.10 queueMicrotask vs Promise.then [verified]

Both use the same microtask queue (HTML 8.8 queue a microtask; ES 9.5.5 via HTML 8.1.6.6.4).

```js
queueMicrotask(() => log('qm1')); Promise.resolve().then(() => log('then')); queueMicrotask(() => log('qm2'));
```
Chrome 155: `qm1`, `then`, `qm2`.

### 4.11 Microtasks enqueued during a checkpoint [verified]

HTML 8.1.7.3: the checkpoint loop is `while microtask queue is not empty`. Jobs added during the loop run in the same checkpoint, before any task.

```js
Promise.resolve().then(() => { log('p1'); Promise.resolve().then(() => log('p1-child')); });
Promise.resolve().then(() => log('p2'));
setTimeout(() => log('timeout'), 0);
```
Chrome 155: `p1`, `p2`, `p1-child`, `timeout`.

### 4.12 MessageChannel vs setTimeout(0) [verified; host-defined]

Spec: `postMessage` queues on the port message queue (HTML 9.4.4 message port post message steps, 9.3.3 posting messages for windows). The timer source is HTML 8.7. Choice of task queue is implementation-defined (HTML 8.1.7.3). There is no spec ordering.

Ten trials per registration order, each from a clean task:

| Order | Chrome 155 | Node 24 |
|---|---|---|
| timer registered first | `timeout0` 10/10 | `message` 10/10 |
| message posted first | `message` 10/10 | `message` 10/10 |

Chrome follows registration order. Node always picks message first. Model rule for Chrome profile: cross-source FIFO by enqueue time (timers at 0ms enqueue immediately). This is an observed behavior, not spec-guaranteed.

### 4.13 Ordering checkpoint around rAF [verified for callback ordering]

Spec: each rAF callback is run by "invoke a callback function", whose cleanup (HTML 8.1.4.4 clean up after running a callback) performs a microtask checkpoint when the JS stack is empty. Run animation frame callbacks is a step of update the rendering (HTML 8.1.7.3).

```js
requestAnimationFrame(() => { log('raf1'); Promise.resolve().then(() => log('raf1-micro')); });
requestAnimationFrame(() => log('raf2'));
```
Chrome 155: `raf1`, `raf1-micro`, `raf2`. Node: no rAF (skipped).

### 4.14 Not verified

- rAF vs `setTimeout` relative order: no deterministic ordering in spec; not measured.
- `yield*` in async generators (PR #2819): not run.
- `async-from-sync` with rejections: not run.

## 5. Recommendation (ranked)

| Rank | Approach | Matches Chrome | Fit for this repo | Risk |
|---|---|---|---|---|
| 1 | Spec-faithful discrete simulator in TS: ES jobs (ES 9.5, 27.5, 27.9, 27.10) + HTML loop (8.1.7, 8.7, 8.8), plus a versioned "Chrome 155 host profile" for timer nesting clamp, cross-source FIFO, timer-0 vs unhandledrejection ordering | All ES-level tick counts (verified). Host behavior matched via profile (verified on one OS). | Pure TS, no dependency, deterministic, testable under Vitest; fits Vue 3 + Pinia store with virtual clock. | Host ordering is observed, not spec. PR #2772 would change `return p` tick rules; must be data-driven. |
| 2 | Real Chrome traces via CDP as oracle in tests only (not runtime) | Ground truth by construction | Adds Playwright dependency already in repo; test-only. | Not researched in depth; trace event names/format unverified; flakiness on timers. |
| 3 | Embed a JS engine (e.g., engine262) to execute user code | ES-level only; no HTML host | Heavy, separate runtime, no DOM tasks | Not researched; not Chrome; not recommended for 100% Chrome match. |

Ranking reason: option 1 is the only one that gives a runtime visualizer with full control over events. Option 2 is valuable as regression oracle. Option 3 cannot match the HTML side. "100%" is achievable only for ES-level semantics and for the Chrome 155 host profile tested here.

## 6. Limitations

- Chrome tested: 155.0.8059.85 on macOS only. Other OS / Chrome versions not tested.
- Headless and headed Chrome agree on all cases except timer jitter.
- V8 internals not inspected; all Chrome behavior is black-box.
- Node versions cross-checked on microtask cases only.
- test262: sparse checkout of await/async/Promise/async-generator dirs. No test pins `return p` tick count (grep of `test/language/*async*`, `test/built-ins/Promise` found none). Tick tests found: `async-await-interleaved.js`, `async-generator-interleaved.js`, `for-await-of-interleaved.js`, `await-monkey-patched-promise.js`, `yield-return-then-getter-ticks.js`.
- Spec drafts change. The HTML and ES snapshots are dated above.
- Rendering (rAF vs timers vs paint) only partially covered.

## 7. Sources

- https://tc39.es/ecma262/ (sections: 9.4, 9.5.5, 14.10.1, 27.1.5.1, 27.1.5.4, 27.5.1.3-9, 27.5.2.1-2, 27.5.3.1, 27.5.4.7.1, 27.5.5.4.1, 27.8.3.7, 27.9.3.2-10, 27.10.5.1-3)
- https://html.spec.whatwg.org/multipage/ (sections: 8.1.4.4, 8.1.4.6, 8.1.4.7, 8.1.6.4, 8.1.6.6.4, 8.1.7.2, 8.1.7.3, 8.1.7.4, 8.7, 8.8, 9.3.3, 9.4.4)
- https://github.com/tc39/ecma262/pull/1250 (merged 2019-02-26, "Reduce the number of ticks in async/await")
- https://github.com/tc39/ecma262/issues/2770 (open, return-direct tick count)
- https://github.com/tc39/ecma262/pull/2772 (open, "Remove Job from Promise Resolve Functions")
- https://github.com/tc39/ecma262/pull/2819 (merged 2022-12-10, async yield*)
- https://github.com/tc39/ecma262/pull/3883 (merged 2026-08-28, Promise.try; not used)
- https://github.com/tc39/test262 (commit d53ebc8): test/language/expressions/await/async-await-interleaved.js, async-generator-interleaved.js, for-await-of-interleaved.js, await-monkey-patched-promise.js; test/language/statements/async-generator/yield-return-then-getter-ticks.js; test/built-ins/Promise/resolve-thenable-immed.js, resolve-thenable-deferred.js, resolve-prms-cstm-then-deferred.js, resolve-self.js

## 8. Unresolved Questions

1. Will PR #2772 merge? If yes, `return p` drops to 2 ticks and Chrome must be re-verified.
2. Chrome's cross-source task selection (timer vs port message vs DOM-manipulation) is observed, not specified. Is it stable across OS / versions?
3. Does `unhandledrejection` always lose to `setTimeout(0)` in Chrome, or only under the tested conditions?
4. rAF vs timer vs paint ordering: needed for the visualizer? Not measured.
5. Should the visualizer expose the Node-vs-Chrome difference as a selectable profile?

## Status

**Status:** DONE_WITH_CONCERNS
**Summary:** Event-loop semantics documented with spec anchors and Chrome 155 ground truth. All ES tick counts verified in Chrome and Node 20/24/26. Host-defined timer and task-ordering behavior recorded as Chrome-observed, not spec-guaranteed. Recommended path: spec-faithful TS simulator with a versioned Chrome host profile.
**Concerns/Blockers:** PR #2772 (open) would change `return p` tick counts. Chrome host ordering is observed on macOS only. rAF vs timer ordering and `yield*` not verified. The doc was written in English per the coordinator's change of instruction; no Vietnamese text was used.
