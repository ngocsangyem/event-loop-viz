# Phase 3: curated steps for the 9 examples (en/vi)

## Overview
Priority: medium · Status: code done (vitest file written, not run; every step resolved in order against real simulator Traces with a one-off script) · Depends on: phase 1 (types)

## Requirements
- **Step count:** 5–9 steps per example, enough to tell the whole story:
  1. Sync code first.
  2. What each API schedules, and into which lane.
  3. The microtask checkpoint drains the Jobs.
  4. The event loop takes the next Task.
  5. The final console order.
- **Vocabulary:** strictly GLOSSARY.md (Task, Job, Checkpoint, Tick, Halt, Budget, …). Never "macrotask", "flush" or "session".
- **Text length:** title ≤ 48 characters; body is 1–3 short sentences. Plain verbs, no hype.
- **Storage:** the text lives in i18n (`drive.examples.<exampleId>.<stepKey>.{title,body}`), and the matchers and targets live in TS. Translators then never touch matchers.
- **Test:** for each example, run the Script with the real simulator (`run-script.ts`, as `examples/__tests__` already does). Assert that every step resolves, that positions strictly increase, and that every message key exists in en and vi.

## Related code files
- Create:
  - `src/examples/drive-steps/<example-id>.ts` (9 files)
  - `src/examples/drive-steps/index.ts`
  - `src/examples/__tests__/drive-steps.test.ts`
  - `src/i18n/messages/{en,vi}/drive-examples.ts`
- Modify: the i18n message index for en/vi, to register the new module.

## Todo
- [x] Read each example's Trace to choose the anchor events
- [x] Write the en steps, then the vi steps
- [x] Coverage test (resolve, monotonic positions, keys in both locales)

## Success criteria
- The test passes for all 9 examples.
- Spot check: the steps tell the same order as the Chrome golden's console output.

## Risks
- **The oracle golden for `sync-promise-async-timeout` is not recorded yet.** That example's step test uses the simulator Trace, which is fine, but the user should still record the golden.

## Implementation notes
- **Step counts:** 3–9 per example, 57 steps in total. `infinite-loop` has 3: Task, `start`, Halt. Its story is short.
- **Anchors:** steps stand on `console` text wherever possible, the most stable anchor. Otherwise they use the nth `timer:init`, `task:queue`, `job:enqueue`, `task:begin`, `checkpoint:begin`, `await:suspend`, `asyncgen:yield`, `rejection:notify` or `run:halted`.
- **Positions found by the one-off check against simulator Traces** (all resolved, strictly increasing):
  - await-vs-then 2…104
  - sync-promise-async-timeout 7…99
  - timers-and-clamp 7…165
  - thenables 33…144
  - async-generators 11…81
  - message-channel 11…42
  - unhandled-rejection 2…79
  - busy-wait 7…5061
  - infinite-loop 2…9
- **Files:** the `CuratedDriveStep` type lives in `curated-drive-step.ts`, so the step files and `index.ts` do not import each other.
- **i18n:** the words live in `{en,vi}/drive-examples.ts`, nested under `drive.examples` in `core-drive.ts`. Strings avoid vue-i18n syntax characters (`{ } @ |`).
- **Test:** `examples/__tests__/drive-steps.test.ts` also fails on orphan message keys, and on a `source` line past the end of the Script.

## Revision (accuracy review, 2026-10-22)
The steps were rewritten after the user reported that the walkthroughs skipped the call stack: 57 → 90 steps. Every callback is now followed through Web APIs / queue → event loop → call stack push → output. `EventMatcher` gained `where` and `after`. Findings and fixes are in `plans/reports/review-2026-10-22-drive-me-walkthrough-accuracy.md`.
