# Execution Engine for Exact Event-Loop Visualization

Date: 2026-10-21. Target: Vue 3 + TS + Vite 8 app (repo: `vite ^8.2.2`, pnpm workspace, Pinia). Ground truth: `docs/research/event-loop-semantics.md` (Chrome 155.0.8059.85).
Scratch (not in repo): `/private/tmp/claude-501/-Users-sangnguyen-Desktop-event-loop-viz/203446b5-be7d-49fb-80d0-23621a0ed394/scratchpad/` (`harness/`, `vite-e262/`).
engine262 pinned to commit `2d7d8d988c77e94473ba0377122cdfccdfe243ba` (npm `@engine262/engine262@0.0.1-2d7d8d98…`). Permalinks below use this SHA.

## 0. Verdict

| Rank | Option | One-line verdict |
|---|---|---|
| 1 | engine262 ES engine in a Web Worker + custom HTML host loop (Chrome profile) | Only option with job-queue hooks, per-node stepping, call-stack access, and 18/18 tick match. Slow, big, no semver. |
| 2 | QuickJS-wasm (`quickjs-emscripten` 0.32.0) + source instrumentation | 18/18 tick match and 50–630x faster than engine262. No job-enqueue, rejection, or step hooks. Fallback if speed dominates. |
| 3 | Instrumented native V8 (AST rewrite, iframe/Worker) | Real Chrome host, native speed. Native `await`/reaction jobs are unobservable. Use as test oracle, not runtime. |
| 4 | Sval 0.6.12 | 13/18 ticks. Async generators wrong. `await` calls patched `then`. Reject. |
| 5 | JS-Interpreter 6.0.2 | ES5 only, no Promise. Reject for this use. |

Key point: the prior semantics doc's rank-1 "TS simulator" still needs something that executes user JS. Writing an ES interpreter from scratch duplicates engine262 (YAGNI/DRY). Use engine262 as the executor and keep the TS work to the host loop.

## 1. Comparison Table

| Criterion | engine262 | QuickJS-wasm | Instrumented native | Sval | JS-Interpreter |
|---|---|---|---|---|---|
| ES coverage | Latest draft. Has `Promise.try`, `Array.fromAsync`, `Set#union`, `Temporal`. No `Intl`, `Atomics`, `SharedArrayBuffer` in default realm (probe). | "most of ES2023" (README) | Native (full) | Partial; async generators broken | ES5 only (README L4) |
| Tick match vs Chrome 155 (18 cases, §5) | 18/18 | 18/18 | 18/18 (native); transformed subset 6/6 | 13/18 | Cannot run Promise cases |
| Job hook | Yes: `jobQueue.enqueuePromiseJob`, `runSingleJobInQueue` | No enqueue hook; `executePendingJobs(n)` only | None (native queue is opaque) | None | None |
| Rejection tracking | Yes: `HostPromiseRejectionTrackers` (reject/handle) | No (`promiseRejectionHandler` typed `TODO`, unimplemented) | Browser `unhandledrejection` event only | No | No |
| Step / call stack | Yes: `onNodeEvaluation`, `onDebugger` + `pauseAt`, `executionContextStack` | Interrupt callback only (coarse) | CDP only (out-of-process) | No | Yes: `step()`, `stateStack` (depth 9 measured) |
| Bundle, Vite prod (min / gzip) | 1,762.74 kB / 369.87 kB (Vite 8.3.4) | 51.5 kB JS (14.3 kB gz) + 503 kB wasm (231.5 kB gz) | 0 | 211.8 kB / 54.2 kB (esbuild min/gz) | 93.8 kB / 27.0 kB |
| Speed, sync loop 1e5 (median) | 3,407 ms | 5.4 ms | 0.9 ms (main ctx); 92 ms (vm ctx) | not measured | not measured |
| Speed, await loop 1e4 | 562 ms | 11.3 ms | 1.2 ms (vm) | not measured | n/a |
| License | MIT | MIT (LICENSE file; GitHub shows NOASSERTION) | n/a | MIT | Apache-2.0 |
| Maintenance (12 mo) | pushed 2026-10-19; 159 commits; 27 contributors; 6 open PRs; 4 open issues; 2 npm owners | pushed 2026-07-23; 11 commits; 51 open issues (incl. PRs) | n/a | pushed 2026-08-05; 50 commits; 13 open issues; release 0.6.12 (2026-04-12) | Upstream pushed 2026-06-17; 19 commits; 45 issues. npm package is a fork (aminmarashi), 1 commit |
| Versioning risk | `0.0.1-<sha>` on every publish (148 versions); no semver | Semver | n/a | Semver | Semver |
| Vite bundling | Yes, with pnpm (npm 10.8.2 cannot install vite, see §2.1) | Node verified; browser wasm load untested | Yes | Not tested | Not tested |

## 2. Option A: engine262

### 2.1 Packaging and bundling

- Package: `@engine262/engine262` (unscoped `engine262` is 404). Metadata: https://registry.npmjs.org/@engine262/engine262. Repo: https://github.com/engine262/engine262.
- `exports`: `import` → `lib/engine262.mjs`, `require` → `lib/engine262.js`. No runtime `dependencies`. `ws` is an optional peer used only by `./inspector`. https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/package.json
- Node-only imports in `lib/engine262.mjs`: 0 matches for `node:`, `require(`, `process.`, `ws`.
- Vite 8.3.4 `vite build` (single entry, `ManagedRealm` + `BasicJobQueue`): one chunk, 1,762.74 kB minified, 369.87 kB gzip, chunk-size warning (>500 kB). Upstream unminified `lib/engine262.mjs` is 4.37 MB (736 kB gzip-9, 463 kB brotli).
- Verified in headless Chrome 155: built page runs and prints `await-thenable@2` (tick 2 matches Chrome).
- Install trap (environment, not engine262): `npm i vite@8.3.4` fails on npm 10.8.2 with `Cannot read properties of null (reading 'edgesOut')`. `pnpm add vite@8.3.4 @engine262/engine262@…` on pnpm 10.17.1 works. Repo already uses pnpm.

### 2.2 Job hooks (source)

Agent options, all in `AgentHostDefined`: `jobQueue`, `eventLoop`, `eventLoopRunType`, `hostHooks`, `onNodeEvaluation`, `onDebugger`. https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/host-defined/engine.mts#L116-L130

Promise jobs enter the host here (`src/execution-context/Job.mts` L49-L62):

```ts
export function HostEnqueuePromiseJob(job: () => PlainEvaluator, realm: Realm | null) {
  ...
  surroundingAgent.jobQueue.enqueuePromiseJob({
    queueName: 'PromiseJobs', job, callerRealm, callerScriptOrModule: scriptOrModule,
  });
}
```
https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/execution-context/Job.mts#L49-L62

- `JobQueue` interface (enqueue/shift per queue type): https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/host-defined/job-queue.mts#L48-L61
- Host executes one job: `runSingleJobInQueue(job, onError, finished)`, asserts empty execution-context stack: same file L8-L40.
- Rejection tracker: `HostPromiseRejectionTracker` calls `hostHooks.HostPromiseRejectionTrackers` (`src/host-defined/engine.mts` L212-L215). Measured ops for `Promise.reject(1); p.catch(); Promise.reject(2)`: `reject, handle, reject`.

**Trap (verified):** the Agent constructor starts the event loop with `options.eventLoopRunType || 'automatic'` (`src/execution-context/Agent.mts` L102). With the default, jobs flush inside your own `evaluateScript` calls. Split test (`prelude` in one call, `case` in another): default → `await-thenable@39` (expected 2); `eventLoopRunType: 'manual'` → `@2`. Always set `'manual'` and drain yourself.

### 2.3 Observability and stepping

- `Evaluate(node)` calls `hostDefinedOptions.onNodeEvaluation(node, realm)` for every node: `src/evaluator.mts` L101-L106. Probe: 21 calls for a 2-function script, max exec-context depth 3.
- Step API: `realm.evaluateScript(src, opts, cb, false)` (fourth arg `false` = do not auto-run), then `agent.resumeEvaluate({ pauseAt: 'step-in' })` with `onDebugger` set and `breakpointsEnabled = true` (`Agent.mts` L167-L199). Step-in skips statements, calls, and blocks (`src/host-defined/debugger-util.mts` L9-L19).
- Measured: `function g(){return 2} function f(x){return g()+x} f(1)` gives 7 step-in pauses. Stack snapshot at a pause: `top>?` (depth 2). Function names via `ctx.Function.nameOrDefault` returned `?` (minor gap).
- `agent.executionContextStack` is public (`declaration/execution-context/Agent.d.mts`).
- Abort control: 20,000 pauses on `while(true){ i++ }` in 160 ms (about 8 µs/pause). Abandon the paused evaluator to stop. This is the only interrupt-like control.
- Missing host builtins: `queueMicrotask`, `setTimeout`, `console`, `structuredClone`, `Error.captureStackTrace`. Host must add them (pattern in `lib-src/node/example.mts`: `surroundingAgent.eventLoop.enqueueAsync(...)`).
- Job kind (reaction vs thenable) is not tagged: `queueName` is always `'PromiseJobs'`. Gap for the `job:enqueue {jobKind}` event (see §7 Q1).

### 2.4 ES coverage and test262

- Feature probe (`typeof`): present = `Promise.try`, `Array.fromAsync`, `Set.prototype.union`, `Object.groupBy`, `Promise.withResolvers`, `ArrayBuffer#transfer`, `Temporal`, `WeakRef`, `FinalizationRegistry`, `Symbol.asyncIterator`. Absent = `Intl`, `Atomics`, `SharedArrayBuffer`, `queueMicrotask`, `setTimeout`, `structuredClone`.
- Features ahead of Chrome 155 may show behavior Chrome lacks. Check per feature before exposing it in the UI.
- test262: no pass rate published in repo or README. Lists at https://github.com/engine262/engine262/tree/main/test/test262: `failed` = 49 path entries (46 under `staging/sm`), `skip` = 9, `features` opt-outs include `-Atomics`, `-SharedArrayBuffer`, `-caller`. Pass rate: unknown (not run; §8).

### 2.5 Speed (median of 5, Node 20, `bench.mjs`)

| Workload | native V8 main ctx | native V8 vm ctx | engine262 | QuickJS-wasm |
|---|---|---|---|---|
| sync loop 1e5 | 0.90 ms | 92.2 ms | 3,407 ms | 5.4 ms |
| await loop 1e4 | n/a | 1.16 ms | 562 ms | 11.3 ms |
| `.then` chain 1e4 | n/a | 10.2 ms | 969 ms | 16.4 ms |

engine262 is about 3,800x slower than main-context native on loops and about 500x on await loops. Acceptable for teaching snippets (tens of ops). Not for loops of 1e5+ inside an interactive UI.

### 2.6 Maintenance and license

- MIT (`package.json`, LICENSE). Stars 949. Pushed 2026-10-19. 159 commits since 2025-10-21. 27 contributors. 6 open PRs, 4 open issues. npm owners: `snek`, `jackworks`.
- Repo tracks API drift: `api-baseline/{src,node,inspector}.d.mts` and `api:check` script (`package.json`). Useful to diff on upgrade. Not in npm package.
- Versions are `0.0.1-<commit-sha>` (148 published, last 2026-10-15). Pin exact version. Every upgrade is an arbitrary commit.

### 2.7 Risks (engine262)

| Risk | Severity | Mitigation |
|---|---|---|
| No semver, commit-hash versions, API churn | High | Pin exact `0.0.1-<sha>`; diff `api-baseline` on upgrade; wrap engine262 behind one adapter module |
| Default auto event loop flushes jobs inside evaluate calls | High (silent wrong ticks) | `eventLoopRunType: 'manual'`; regression test = split-eval probe |
| Speed (3,800x vs native on loops) | Medium | Snippet size cap; step budget; run in Worker; `worker.terminate()` |
| Job kind not exposed | Medium | Accept `reaction`/`thenable` merge; or patch engine (fork) |
| Bundle 370 kB gz in app | Low-Medium | Lazy-load Worker chunk only when visualizer opens |
| test262 unknown | Medium | Run test262 at pinned SHA before relying on edge cases |
| Feature drift vs Chrome 155 (ahead-of-browser features) | Low | Allow-list features in UI |
| Bus factor (2 npm owners) | Medium | Pin; keep adapter small to allow swap |

## 3. Option B: Instrumented native execution

### 3.1 Why native `await` bypasses patched `then` (spec)

Each step below is ECMA-262 text verbatim (section anchors on tc39.es):

- **Await** (`#await`, 27.10.5.3): `Let promise be ? PromiseResolve(%Promise%, arg).` Then `Perform PerformPromiseThen(promise, onFulfilled, onRejected).` No `Get(promise, "then")` appears. A patched `Promise.prototype.then` is never read.
- **PromiseResolve** (`#sec-promise-resolve`, 27.5.4.7.1): `If IsPromise(resolution) is true, then Let resolutionCtor be ? Get(resolution, "constructor"). If SameValue(resolutionCtor, ctor) is true, return resolution.` Only `constructor` is read.
- **Promise Resolve Functions** (`#sec-promise-resolve-functions`, 27.5.1.3): `Let then be Completion(Get(resolution, "then"))` runs synchronously. If callable, `NewPromiseResolveThenableJob` (`#sec-newpromiseresolvethenablejob`, 27.5.2.2) is enqueued through `HostEnqueuePromiseJob` (`#sec-hostenqueuepromisejob`, 9.5.5). The job calls `HostCallJobCallback(then, thenable, …)`. This is why thenables cost 2 ticks and why `return p` costs 3.
- **Async return** (`#sec-asyncblockstart`, 27.10.5.2): the return value goes through the resolve function, so `Get(value, "then")` runs. A patched `then` observes `return p`.
- **Promise.prototype.finally** (`#sec-promise.prototype.finally`, 27.5.5.3): `Return ? Invoke(p, "then", « valueThunk »)`, plus `Invoke(promise, "then", …)` for the outer call. Patched `then` is observed.
- **Promise.all** (`#sec-promise.all`, 27.5.4.1): `Perform ? Invoke(nextPromise, "then", « onFulfilled, resultCapability.[[Reject]] »)` per element. Patched `then` is observed. Same pattern for `allSettled`, `race`, `any`.
- **AsyncGeneratorYield** (`#sec-asyncgeneratoryield`, 27.9.3.8) uses Await: not observed. `for await` over sync iterables uses `AsyncFromSyncIteratorContinuation` (27.1.5.4) with PerformPromiseThen directly: not observed.

Measured (`patched-observability.mjs`, V8 = engine262 for all rows):

| Operation | Patched `then` calls |
|---|---|
| `await Promise.resolve(1)` | 0 |
| `async` `return Promise.resolve(1)` | 1 (thenable job) |
| `new Promise(r => r(p))` | 1 |
| `Promise.all([p])` | 1 |
| `Promise.allSettled` / `race` / `any` | 1 each |
| `p.finally(f)` | 3 |
| `for await (x of [p])` | 0 |
| `yield p` in async generator | 0 |

Consequence: a `then` wrapper sees builtins and `return` but not `await`. Visualizer built on `then` patching is internally inconsistent. It cannot show awaits.

### 3.2 Instrumentation design and mitigations

- Pipeline: parse (acorn or Babel) → rewrite → emit JS → run in iframe or Worker.
- **Async functions → generators via asyncToGenerator** (Babel-style helper, hand-written). Tick test (`asynctogen-fidelity.mjs`): equal to native for `await` native, non-promise, thenable, `return p`, `return await p`, `return 1` (6/6). Not tested: async generators, `for await`, `yield*`, `try/finally` with await.
- Helper must capture intrinsics at start: its own `Promise.resolve(v).then(...)` calls patched `then` on native promises (by construction; not separately run). Use captured `__then` and `Promise`.
- **Call stack:** shadow stack by wrapping function bodies (push/pop in try/finally). Cost: one wrapper per function call.
- **Job events:** not observable for native reactions. Only instrumented `then` (user and helper) emits events. Ticks are observable by probe (same method as this research) but job identity is not.
- **Host fidelity:** free. Real Chrome timers, nesting clamp, rendering, and `unhandledrejection` are native. This is the main advantage over option A.
- **Infinite loops:** insert budget counter at loop heads (`if (--__budget < 0) throw …`) or terminate a Worker. Synchronous loop in main thread freezes UI. Use Worker.
- **Sandbox:** `<iframe sandbox="allow-scripts">` without `allow-same-origin` gives an opaque origin (`#attr-iframe-sandbox`). Worker (`#dom-worker-terminate`) has no DOM. Add CSP (`connect-src 'none'`, no `eval` where possible). Iframe is not guaranteed out-of-process; do not rely on site isolation.
- **Observable exactly:** return values, user log order, host ordering (native), timer nesting clamp (native), `unhandledrejection` (native).
- **Not observable exactly:** reaction jobs for `await`, promise state transitions, tick IDs, and `eval`/`new Function` code unless also instrumented.

### 3.3 Risks

- Transform drift: rewriter bugs change ordering silently. Needs its own test suite (the §5 cases).
- Code growth and source-map work per function.
- Tick fidelity depends on the helper matching the spec for each construct. Async generators are the open case.
- Security depends on browser sandbox correctness; keep Chrome current.

## 4. Other Candidates

### 4.1 QuickJS-wasm (`quickjs-emscripten` 0.32.0)

- Wrapper: https://github.com/justjake/quickjs-emscripten (MIT). Core: npm `quickjs-emscripten-core@0.32.0`. Underlying QuickJS: 2025-09-13 (string in `emscripten-module.wasm`). README: "supports most of ES2023". A `quickjs-ng` variant is also offered (README).
- Job control: `runtime.executePendingJobs(maxJobs)` and `hasPendingJob()` (core `index.d.ts` L278, L310). Verified: `executePendingJobs(1)` steps one job at a time; 3 steps for the probe.
- Rejection: `promiseRejectionHandler?: TODO<"JSHostPromiseRejectionTracker">` (core `index.d.ts` L498). Not exposed.
- Interrupt: `setInterruptHandler` (L287). Verified: `while(true){}` interrupted after 200 callbacks.
- No per-node or enqueue hook. Stack only from thrown `Error.stack`. Visualizer needs source instrumentation (as in option B) for frames.
- Ticks: 18/18 match Chrome 155. Speed §2.5.
- Bundle: JS glue 51.5 kB min (14.3 kB gz); `emscripten-module.wasm` 503 kB (231.5 kB gz, 199 kB brotli). Browser load via Vite `?url` not tested.
- Maintenance: pushed 2026-07-23, 11 commits in 12 months, npm 0.32.0 (last modified 2026-02-16). Contributor count not checked.

### 4.2 Sval 0.6.12

- https://github.com/Siubaak/sval (MIT, pushed 2026-08-05, 50 commits in 12 months, release 0.6.12 2026-04-12).
- Ticks 13/18. Mismatches: async generator yield/return (5 and 5 and 5 ticks vs 2, 2, 3; yielded value stays a Promise object), `for await` ordering (sync before `g1`, and extra ticks), `await` calls patched `then` (1 call vs 0).
- Probe artifacts: ticks read from host counter (`run-sval.mjs`).
- Verdict: reject for event-loop-exact use.

### 4.3 JS-Interpreter 6.0.2

- Upstream: https://github.com/NeilFraser/JS-Interpreter (Apache-2.0, pushed 2026-06-17, 19 commits in 12 months). README: "Execute arbitrary ES5" (L4).
- npm `js-interpreter@6.0.2` points to a fork (https://github.com/aminmarashi/JS-Interpreter, 1 commit in 12 months). Verify source before use.
- Probe: `let`, `const`, arrow, class, generator, `async`, `Promise`, `queueMicrotask` all fail (SyntaxError or ReferenceError).
- Stepping works: `step()` loop, `stateStack` depth 9 on a 2-function script.
- Verdict: ES5 teaching mode only. Not for this app.

### 4.4 Not evaluated

- Boa: no official npm/wasm build found (`boa_wasm` unpublished 2024-03-07).
- Hermes: React Native target; not checked further.
- CDP-driven native tracing (test oracle option): `Debugger.stepInto({breakOnAsyncCall})` and `setAsyncCallStackDepth` exist. No promise-reaction or microtask events in `js_protocol.json` (https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json). Usable for a Playwright-based oracle in `e2e/`, not in runtime.
- Node `async_hooks` promise hooks: Node-only (https://nodejs.org/api/async_hooks.html). Not in browser.

## 5. Tick Cases (empirical)

Method: a microtask probe (`__origThen.call(Promise.resolve(), __probe)`, one run per FIFO round). `mark()` records probe count `n`. Tick = `n − 1`. Chrome 155 is the oracle. V8 = Node 20.20.2 (V8 11.3). engine262 uses `eventLoopRunType: 'manual'`. Sval value printed as tick directly.

| Case | Chrome 155 | V8 Node 20 | engine262 | QuickJS | Sval |
|---|---|---|---|---|---|
| await native | 1 | 1 | 1 | 1 | 1 |
| await non-promise | 1 | 1 | 1 | 1 | 1 |
| await thenable | 2 | 2 | 2 | 2 | 2 |
| `return p` (async) | 3 | 3 | 3 | 3 | 3 |
| `return await p` | 2 | 2 | 2 | 2 | 2 |
| `return 1` | 1 | 1 | 1 | 1 | 1 |
| `new Promise(r => r(p))` | 3 | 3 | 3 | 3 | 3 |
| `new Promise(r => r(thenable))` | 2 | 2 | 2 | 2 | 2 |
| async gen `yield Promise.resolve('v')` | 2 (value `v`) | 2 | 2 | 2 | **5** (value is Promise) |
| async gen `return 1` | 2 | 2 | 2 | 2 | **5** |
| async gen `return thenable` | 3 | 3 | 3 | 3 | **5** |
| `Promise.all([p])` | 2 | 2 | 2 | 2 | 2 |
| `p.finally(f)` | 4 | 4 | 4 | 4 | 4 |
| `Promise.resolve(p) === p` / `new Promise(r=>r(p))` | 0 / 3 | 0 / 3 | 0 / 3 | 0 / 3 | 0 / 3 |
| await vs then interleave | 1, 1, 2 | 1, 1, 2 | 1, 1, 2 | 1, 1, 2 | 1, 1, 2 |
| for-await async gen | g1 0, sync 0, a 2, g2 2, b 4, done 5 | same | same | same | **sync 0, g1 1, a 5, g2 6, b 10, done 15** |
| patched `then` + `await` | 0 calls | 0 | 0 | 0 | **1** |
| patched `then` + `return p` | 2 calls at tick 3 | same | same | 2 at tick 3 | 2 at tick 3 |

Results: engine262 18/18, V8 18/18, QuickJS 18/18 (all run in the same harness), Sval 13/18. Chrome 155 is the oracle. Full cases file: `harness/cases.mjs`.

Note: the `interleave-await-then` order (`await, then1, then2`) matches the semantics doc §4.2.

## 6. Recommendation (ranked)

### Rank 1: engine262 in a Worker, plus custom HTML host loop (hybrid)

Architecture:
- Web Worker (lazy chunk) owns `Agent({ jobQueue, eventLoopRunType: 'manual', onNodeEvaluation, onDebugger })` and one `ManagedRealm` per run.
- Worker host loop (TS, about 200–300 lines): task sources (timer, posted-message, DOM-manipulation), a microtask checkpoint that drains `jobQueue` via `runSingleJobInQueue`, Chrome profile rules from the semantics doc (timer nesting clamp per HTML `#timer-initialisation-steps`, cross-source FIFO by enqueue time, `unhandledrejection` as a DOM-manipulation task after checkpoint).
- Events posted to main thread in batches → Pinia store → Vue. Frame events from `onNodeEvaluation` + `executionContextStack` depth.
- Budget: step-in pauses with a node cap, plus `worker.terminate()` as hard stop.
- Pin `@engine262/engine262@0.0.1-2d7d8d988c77e94473ba0377122cdfccdfe243ba` behind one adapter file.

Why: only option that gives job-queue hooks, rejection hooks, and call-stack/step access while matching 18/18 ticks. Cost: 370 kB gz (lazy), 3,800x slower on loops, version pinning.

### Rank 2: QuickJS-wasm + source instrumentation

Why: 18/18 ticks, fast, 245 kB gz total, MIT, semver. Missing: enqueue and rejection hooks, per-node stepping. Would need the host loop to infer jobs from `executePendingJobs(1)` boundaries and to rebuild rejection tracking. Choose this if engine262 speed is unacceptable for the target snippets.

### Rank 3: Instrumented native V8

Why: real Chrome host and speed, but native reactions are invisible. Best use: an oracle for regression tests (headless Chrome + probe, or CDP `stepInto({breakOnAsyncCall})`), mirroring the semantics doc §5 rank 2.

### Rank 4 and 5: Sval, JS-Interpreter

Reject for exact tick visualization (see §4).

## 7. Limitations

- Chrome tested on macOS only (155.0.8059.85). Firefox and Safari not tested. Node 20 used for V8 cross-check.
- test262 not run. No pass rate.
- engine262 tested at SHA `2d7d8d9`. HEAD `267d1d4` (2026-10-15) not tested.
- QuickJS browser run and Sval/JS-Interpreter bundling not tested.
- asyncToGenerator tested for 6 non-generator cases only.
- Benchmarks: one machine, 5 reps, median. Native baseline varies 0.9 ms to 92 ms by context choice. Reported both.
- No CDP tracing prototype. No Boa/Hermes evaluation.
- Did not test engine262 `Intl` via `ecma402` (source exists; absent in default realm).

## 8. Empirical Results: Versions and Commands

Versions: Node v20.20.2 (V8 11.3.244.8-node.38); npm 10.8.2; pnpm 10.17.1; Chrome 155.0.8059.85; `@engine262/engine262@0.0.1-2d7d8d988c77e94473ba0377122cdfccdfe243ba`; `quickjs-emscripten@0.32.0` (core 0.32.0, `@jitl/quickjs-wasmfile-release-sync@0.32.0`, QuickJS 2025-09-13); `js-interpreter@6.0.2`; `sval@0.6.12`; `esbuild@0.28.2`; `vite@8.3.4`.

Commands (run from `scratchpad/harness` unless noted):
- Shared cases: `cases.mjs`.
- V8: `node run-v8.mjs`
- engine262: `node run-e262.mjs` (manual loop)
- QuickJS: `node run-qjs.mjs`
- Sval: `node run-sval.mjs`
- Chrome oracle: `node make-chrome-oracle.mjs && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-sandbox --virtual-time-budget=5000 --dump-dom "file://$PWD/chrome-oracle.html"`
- Diff: inline Python comparing JSON outputs (0 mismatches for V8, engine262, QuickJS vs Chrome).
- Split-eval trap: `node probe-e262-split.mjs` (default, gives 39) vs `MANUAL=1 node probe-e262-split.mjs` (gives 2).
- Stepping: `node probe-e262-stack.mjs` (7 pauses), `node probe-e262-budget.mjs` (20k pauses, 160 ms).
- Rejection ops: `node probe-e262-reject.mjs` → `["reject","handle","reject"]`.
- Patched then: `node patched-observability.mjs`.
- asyncToGenerator: `node asynctogen-fidelity.mjs` (6/6 same).
- Features: `node probe-e262-features.mjs`.
- QuickJS interrupt and job stepping: `node probe-qjs-misc.mjs`.
- JS-Interpreter: `node probe-jsi.mjs`. Sval: `node probe-sval.mjs`.
- Speed: `N_LOOP=100000 N_AWAIT=10000 node bench.mjs`.
- Sizes: `./node_modules/.bin/esbuild entry.mjs --bundle --format=esm --platform=browser --minify`; `gzip -9`; `brotli -q 11`.
- Vite: `cd vite-e262 && pnpm add vite@8.3.4 @engine262/engine262@0.0.1-2d7d8d98… && npx vite build` → `dist/assets/index-*.js 1,762.74 kB │ gzip: 369.87 kB`. Browser check: `python3 -m http.server` in `dist`, then Chrome `--dump-dom` → `engine262 in browser: ["await-thenable@2"]`.

## 9. Sources

- engine262 repo: https://github.com/engine262/engine262
- engine262 package.json @ pinned SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/package.json
- engine262 `src/host-defined/engine.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/host-defined/engine.mts
- engine262 `src/execution-context/Job.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/execution-context/Job.mts
- engine262 `src/host-defined/job-queue.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/host-defined/job-queue.mts
- engine262 `src/host-defined/event-loop.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/host-defined/event-loop.mts
- engine262 `src/execution-context/Agent.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/execution-context/Agent.mts
- engine262 `src/evaluator.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/evaluator.mts
- engine262 `src/host-defined/debugger-util.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/host-defined/debugger-util.mts
- engine262 `src/api.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/src/api.mts
- engine262 `lib-src/node/example.mts` @ SHA: https://github.com/engine262/engine262/blob/2d7d8d988c77e94473ba0377122cdfccdfe243ba/lib-src/node/example.mts
- engine262 test262 lists: https://github.com/engine262/engine262/tree/main/test/test262
- engine262 api-baseline: https://github.com/engine262/engine262/tree/main/api-baseline
- engine262 npm: https://registry.npmjs.org/@engine262/engine262
- quickjs-emscripten repo: https://github.com/justjake/quickjs-emscripten
- quickjs-emscripten-core npm: https://www.npmjs.com/package/quickjs-emscripten-core
- quickjs-emscripten npm: https://www.npmjs.com/package/quickjs-emscripten
- Sval: https://github.com/Siubaak/sval
- JS-Interpreter upstream: https://github.com/NeilFraser/JS-Interpreter
- JS-Interpreter npm fork source: https://github.com/aminmarashi/JS-Interpreter
- Chrome DevTools Protocol JSON: https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json
- Node async_hooks: https://nodejs.org/api/async_hooks.html
- ECMA-262 (draft, fetched 2026-10-21): https://tc39.es/ecma262/#await ; #sec-promise-resolve ; #sec-performpromisethen ; #sec-newpromiseresolvethenablejob ; #sec-promise-resolve-functions ; #sec-asyncblockstart ; #sec-hostenqueuepromisejob ; #sec-promise.prototype.finally ; #sec-promise.all ; #sec-asyncgeneratoryield ; #sec-return-statement-runtime-semantics-evaluation
- HTML Living Standard (fetched 2026-10-21): https://html.spec.whatwg.org/ ; #perform-a-microtask-checkpoint ; #queue-a-microtask ; #timer-initialisation-steps ; #attr-iframe-sandbox ; #dom-worker-terminate
- Prior research (repo): `docs/research/event-loop-semantics.md`
- Vite: https://www.npmjs.com/package/vite ; esbuild: https://www.npmjs.com/package/esbuild

## 10. Unresolved Questions

1. engine262 does not tag job kind (`reaction` vs `thenable`). Can the host infer it without a fork (e.g., by wrapping `NewPromiseResolveThenableJob` at the `then` call site)? Untested.
2. test262 pass rate for engine262 at the pinned SHA. Needs a test262 checkout and run.
3. Will engine262 adopt semver or stable tags? Current policy unknown.
4. Does `WebLikeEventLoop` (or a custom `eventLoop`) reproduce Chrome's cross-source FIFO for timer vs message? Not tested.
5. Does Chrome 155 ship `Promise.try` and `Array.fromAsync`? engine262 has them; Chrome check not run.
6. QuickJS wasm load in the Vite browser bundle (`?url` asset) not verified.
7. Does the asyncToGenerator transform match native for async generators and `for await`? Not tested.
8. Is a CDP-driven tracer viable as a regression oracle in `e2e/` (Playwright)? Not prototyped.

## Status

**Status:** DONE_WITH_CONCERNS
**Summary:** Ranked: (1) engine262 in Worker + custom HTML host loop; (2) QuickJS-wasm + instrumentation; (3) instrumented native V8 as oracle only; (4) Sval; (5) JS-Interpreter. engine262 and QuickJS match Chrome 155 on 18/18 tick cases; Sval 13/18. Vite bundles engine262 (1.76 MB min / 370 kB gz).
**Concerns/Blockers:** engine262 default event loop auto-flushes jobs (must set `eventLoopRunType: 'manual'`); no semver (commit-hash versions); no test262 pass rate; job kind not exposed; QuickJS has no rejection or step hooks. Full list in section 10.
