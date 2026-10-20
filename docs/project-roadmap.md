# Project roadmap

Spec: GitHub issue #1. Status reflects the `integration/v1` branch at the time of writing.

## v1 milestones

| Milestone | Scope | Status |
|---|---|---|
| M1 Tracer bullet | `runScript` on engine262 with console and `setTimeout`, bare Vue replay, import-boundary lint | Done |
| M2 Engine and host fidelity | Promise Jobs, Checkpoints, engine262 patch, async/await, thenables, async generators, timers and clamp, errors and unhandled rejections, `MessageChannel`, Unsupported API stubs, Budgets and Halts, Trace schema v1 frozen, `test:oracle` green | Done |
| M3 Replay | Player core, play/pause and speed, scrubber with Tick/Task jumps, source and cause highlight, explanations, detail pane, filters | Done |
| M4 Scene | Isometric Scene: call stack, console, themes, queues, timers, Virtual Clock (done); promises, suspended awaits and async generators; transitions and reduced motion | In progress |
| M5 Editor and sharing | CodeMirror editor, syntax-error and Unsupported API reporting, example library, share links | Done |
| M6 Robustness | Worker with watchdog and cancel, long-Script performance and advanced settings, responsive layout (done); accessibility pass, complete e2e suite | In progress |
| M7 Ship | CI, production build gate (done); README and project docs (this change); manual Vercel deploy | In progress |

Deploy is manual: follow `docs/deployment-guide.md`, then add the URL to the README.

## v1.1 candidates

- `requestAnimationFrame`: first candidate (ADR-0006). Its ordering against timers is unverified
  against the Oracle, so it ships only behind differential fixtures.
- Seeded, grammar-based fuzzer for differential testing (ADR-0008): mixes `then`, `await`,
  thenables, async generators, `queueMicrotask`, timers with safe delays and `throw`/reject;
  about 200 programs per PR and 10,000 nightly, with automatic minimization of mismatches into the
  curated cases.

## Standing maintenance

- A Chrome major bump needs a new Host Profile, re-recorded goldens, and re-verification of the
  cross-source task FIFO rule (ADR-0010).
- An engine262 bump must keep the ADR-0009 patch applying and manual Job execution intact.
