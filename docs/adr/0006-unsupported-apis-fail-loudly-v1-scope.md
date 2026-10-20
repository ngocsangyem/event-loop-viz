# v1 scope: Unsupported APIs fail loudly instead of being approximated

**Supported in v1:**
- Everything engine262 implements, including Promise, async/await, generators, async generators, and `for await`.
- `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`
- `queueMicrotask`
- `console.log`, `console.info`, `console.warn`, `console.error`
- `Date.now()` and `performance.now()`, which read the Virtual Clock.
- Scripts run as classic scripts.

**Unsupported in v1:** `fetch`, the DOM, `requestAnimationFrame`, `MessageChannel`/`postMessage`, `addEventListener`, modules and `import`, `FinalizationRegistry`/`WeakRef`, `Atomics.wait`, `SharedArrayBuffer`. Each exists as a stub that throws `UnsupportedApiError`, and a pre-run static scan lists them, so users get a clear message instead of a misleading `ReferenceError` or a guessed ordering.

Excluded for these reasons:
- `rAF`: its ordering against timers is unverified against the Oracle.
- `MessageChannel`: its cross-source ordering is only black-box observed.
- GC-dependent APIs: not deterministic.

`MessageChannel` and `rAF` are the first candidates for v1.1, each gated on differential tests.
