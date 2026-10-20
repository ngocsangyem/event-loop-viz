# engine262 for ECMAScript, a hand-written HTML host, both in a Web Worker

User Scripts run inside engine262, a spec-faithful ECMAScript interpreter, with `eventLoopRunType: 'manual'`. A host written in TypeScript implements the HTML event loop: task queues, a Virtual Clock, timers including the nesting clamp, Checkpoints, and rejection tracking. Both run in a lazily loaded Web Worker. engine262 is the only candidate that hands every promise Job to the host and exposes rejection tracking, stepping, and the call stack. It matched Chrome 155 on all 18 tick cases (see `docs/research/execution-engine.md`).

## Considered Options

- **Instrumented native V8 (AST rewrite with a patched Promise):** rejected. Native `await` calls PerformPromiseThen directly and never reads a patched `then`, so await Jobs are invisible. Kept as a possible regression Oracle only.
- **QuickJS-wasm:** 50–630× faster with matching ticks, but it has no enqueue hook, no rejection tracker, and no per-node stepping. It is the fallback if speed becomes the bottleneck, which is why the host talks to an `EngineAdapter` interface (ADR-0005).
- **Sval, JS-Interpreter:** wrong async-generator ticks, and ES5 only, respectively.

## Consequences

- engine262 is roughly 1000× slower than native, so Budgets are mandatory (ADR-0004).
- engine262 has no semver; we pin an exact commit.
- The 370 kB gzip bundle stays out of the main chunk.
- The default `eventLoopRunType` silently flushes Jobs inside evaluate calls. A regression test guards the `'manual'` setting.
- Validated by the throwaway prototype on branch `prototype/engine262-trace` (commit 014123a). 13/13 hard cases matched live Chrome 155 console order, in the browser, with a hand-written host on a Virtual Clock.
- The engine262 chunk must keep its function names: build it with keep-names, or leave it unminified. Normal minification renames built-ins (`Promise#then` becomes `Ax`), which breaks frame labels. The cost: 375 kB gzip minified vs 571 kB gzip unminified.
- The prototype ran on the main thread. A 100k-iteration loop blocked it for 1.3 s, which confirms that the Worker is required.
