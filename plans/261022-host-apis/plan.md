# Host APIs: fetch, DOM, rAF, postMessage, events, port transfer, modules, WeakRef/FR, SAB/Atomics

Facts: `docs/research/host-api-semantics.md` (Chrome 155 probes). User decisions (2026-10-22):
`fetch` to http(s) uses `// @fetch` mock directives (unmocked = `TypeError: Failed to fetch`);
modules are auto-detected (Script that only parses as a module runs as one).

## Trace schema v3 (additive)

- `task:queue.source` += `animation-frame`, `posted-message`, `networking`, `javascript-engine`.
- `task:queue.opId?`: the Web API operation the Task completes (removes its card).
- `webapi:start { opId, api, taskId?, dueUs?, callback?, detail? }`, `webapi:cancel { opId }`.
  `api`: `requestAnimationFrame | fetch | body | import | waitAsync`.
- `render:frame { frameMs, callbacks }`: a rendering opportunity that runs animation-frame callbacks.
- `checkpoint` reason `callback-end` (already in v2) is now emitted between event listeners.
- `exception:report.origin` += `event-listener`.
- header `sourceType: 'script' | 'module'`.

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Recorder: directives `@oracle-module`, `@oracle-isolated`, `@fetch` (page.route), `--expose-gc`, Script in `<body>`; re-record all goldens, existing ones unchanged | done |
| 2 | Host: schema v3, generic host task queue (ready + delayed), multi-listener tasks with `callback-end` checkpoints, `reportException`, kept-objects clearing, GC roots, animation-frame scheduler, timing sensitivity for frames | done |
| 3 | Engine: Web IDL helpers, Event/EventTarget/CustomEvent/MessageEvent/ErrorEvent/PromiseRejectionEvent, window (`Window.prototype` chain, handlers), structured clone + DOMException, MessagePort as EventTarget + transfer, `window.postMessage`, rAF | done |
| 4 | Engine: DOM document/elements (tree, selectors, click, onclick) | done |
| 5 | Engine: fetch, Response, Headers, data URLs, mock directives | done |
| 6 | Engine: modules (detection, data: loader, dynamic import task, import.meta, TLA, error report) | done |
| 7 | Engine: gc(), WeakRef kept objects, FinalizationRegistry cleanup task, GC marking of host-held values | done |
| 8 | Engine: SharedArrayBuffer (isolated page), Atomics (wait throws, waitAsync notify) | done |
| 9 | UI: phrasebooks en/vi, event families, Web APIs op cards, task source labels, diagram flows, supported-APIs popover, examples + fixtures + goldens | done |
| 10 | Docs (README, architecture, glossary, roadmap), tests, review | done |

## Invariants

- Observable Output of every existing Fixture is unchanged.
- Every new behaviour has a Fixture recorded in Chrome 155, or a simulator-side expectation when
  Chrome is non-deterministic.
- Old event kinds keep their meaning; players ignore unknown kinds.

## Findings during implementation

- engine262's own `gc()` never traverses a declarative environment's `bindings` Map, so values in
  `let` / `const` are invisible to it: the adapter runs its own mark-and-clear (gc-and-finalization.ts).
- A Fixture recorded as a module must contain module syntax; the oracle test enforces it.
- `data:` responses have `statusText` "OK" (first reading of the probe was wrong; corrected).

## Unresolved

- Cleanup order of 3+ FinalizationRegistry cells varies in Chrome: no Fixture pins it.
- e2e suite: 120 of 127 specs already fail on the base commit (stale selectors such as `getByRole("button", { name: "Run" })` now matching "Run settings"); this change adds no new failure.
