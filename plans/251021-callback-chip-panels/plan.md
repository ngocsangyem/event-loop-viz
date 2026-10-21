---
title: "Callback chips in the Panels view"
description: "Show each callback as a code chip that travels code -> Web APIs card -> queue -> call stack, and queue timer Tasks only when they are due."
status: completed
priority: P2
effort: 27h
branch: main
tags: [panels, trace, engine262, animation, event-loop, i18n]
created: 2026-10-21
---

# Callback chips in the Panels view

Inspired by Lydia Hallie's "JavaScript Visualized: Event Loop". A callback becomes a visible chip
(`() => console.log("2000ms")`) that moves between panel cards. Source-line highlighting stays.
Scope: Panels view only. The Diagram and 3D views stay as they are, except that P1 updates the
Diagram so it agrees with the new timer timing.

## Phases

| # | Phase | Effort | Depends on | Status |
|---|---|---|---|---|
| 1 | [Queue a timer Task when it is due (bug fix, schema v2)](phase-01-queue-timer-task-when-due.md) | 5h | none | completed |
| 2 | [Callback descriptors in the Trace and engine plumbing](phase-02-callback-descriptors-in-trace-and-engine.md) | 6h | 1 | completed |
| 3 | [Replay state and panel chips (static)](phase-03-replay-state-and-panel-chips.md) | 5h | 2 | completed |
| 4 | [Web APIs timer card (callback + delay slots, browser arrow)](phase-04-web-apis-timer-card.md) | 3h | 3 | completed |
| 5 | [Chips travel across panels (FLIP ghost layer)](phase-05-cross-panel-chip-travel.md) | 5h | 3 | completed |
| 6 | [End-to-end tests and docs](phase-06-e2e-tests-and-docs.md) | 3h | 4, 5 | completed |

Phases 4 and 5 can run in parallel after phase 3 (file ownership is disjoint, see each phase).
Phases 1 to 3 change shared host, player and engine files, so they run in order.

## Order compared with the suggested one
The timer timing fix comes first. It is a standalone bug fix that can ship on its own, it has the
largest effect on tests (event order, Diagram flow, explanations), and doing it first keeps that
churn apart from the engine-patch work in phase 2.

## Key decisions (details in phase files)
- **Timer timing:** a timer's `task:queue` is emitted the first time the Virtual Clock reaches the
  due time, wherever the clock advances: in `onNode` (so a busy-wait shows the Task joining the
  queue while the long Task still runs) and when the loop jumps the clock forward. The order Tasks
  run in does not change, so Observable Output and the oracle stay the same. Port messages are
  already queued at post time, which follows the spec, so they do not change.
- **Schema:** `TRACE_SCHEMA_VERSION` goes from 1 to 2. Fields are added, the timing of an
  existing event changes, and `trace-schema.test.ts` requires a version bump for any shape change.
  Traces are never stored (share links carry inputs only), so nothing needs migrating. The
  reducer still replays v1 Traces, and the v1 golden Traces stay in the tests as a
  backward-compatibility check.
- **Callback descriptor:** `CallbackInfo {kind: function|await|builtin, loc?, name?}`. For a
  function, the text is `header.source.slice(loc.start, loc.end)`, so the Trace holds a range and
  never a copy of the text.
- **Chip identity:** a chip's id is its taskId or jobId. The same id is used on the Web APIs card,
  the queue row and the callback's call-stack frame.
- **Travel:** FLIP with ghost clones in a fixed overlay. Chips stay inside their panels in the DOM,
  which keeps them accessible and testable. The overlay exists only while a chip is moving. Only a
  single step animates. Jumps snap. Reduced motion snaps.

## Rollback
Each phase is a separate commit on the feature branch. To undo phase N, revert its commit and the
commits of every later phase. Phase 1 can be reverted on its own: it restores emitting the timer
Task at init and schema v1.

## Unresolved questions
See the end of each phase file. The main ones are listed in phase 6.
