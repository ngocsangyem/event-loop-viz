# Phase 6: end-to-end tests and docs

## Context links
- e2e conventions: `e2e/README.md`: no fixed sleeps, `page.clock.install()` for playback, `retries: 0`, story numbers 1 to 57.
- Helpers: `e2e/fixtures.ts`, `e2e/reveal-panel.ts`. Patterns: `e2e/visualizer-view.spec.ts`, `e2e/scene-queues-timers.spec.ts` (`stepUntilPresent`, `lastSeq`, `current`).
- Docs: `GLOSSARY.md`, `docs/system-architecture.md` (module table rows for `trace/`, `engine/`, `host/`, `renderer/panels/`; "Determinism and correctness" mentions the "frozen Trace schema v1 snapshot"), `docs/project-roadmap.md` (the M2 row says "Trace schema v1 frozen", which is history), `README.md` ("How it works").

## Overview
Priority P2. Status: completed. Learner-level checks of the whole feature, and docs updated so the code stays the only record of decisions. No ADRs.

## Key insights
- Phases 1 to 5 each ship their own unit tests and keep CI green. This phase adds the cross-cutting e2e and the docs.
- Travel e2e must not depend on animation timing. Assert the end state: the chip id is in the target panel, and no `.chip-ghost` is left. Assert a ghost existed only with `expect.poll`, and only under `reducedMotion: 'no-preference'`.

## Requirements / test matrix
| Level | What | Where |
|---|---|---|
| Unit (done in P1-P5) | Timer queued when due; callback descriptors per kind; running-callback frame rule; chip model with one place per id; card model; step detection; travel plan | `src/**/__tests__` |
| Integration | All examples: one place per chip id at every position; Observable Output unchanged | `src/renderer/panels/__tests__/callback-chip-model.test.ts` (P3), `test:oracle` |
| e2e (new) `e2e/callback-chips.spec.ts` | (1) The Web APIs card shows the `setTimeout` title, the chip text, `2000ms` and the Browser arrow. (2) Stepping: the chip id moves card -> Task Queue -> Call Stack, then is gone, and the console shows `2000ms`. (3) busy-wait example: the Task Queue has the timer chip while the Call Stack still shows the Script. (4) Microtask: the `.then` chip goes to the Microtask Queue, then the stack. (5) await: the chip text contains "after await" (EN) / "sau await" (VI). (6) A scrubber jump creates no ghost. (7) Reduced motion creates no ghost. (8) A long callback is cut with an ellipsis, and the `title` holds the full text. (9) At 375 px, no horizontal overflow on the panels. (10) Dark theme: the chip contrast passes axe. | new spec |
| e2e (existing) | `visualizer-view`, `source-highlight`, `scene-queues-timers` (fix the stale comment), `diagram-view`, `accessibility`, `responsive-layout`, `i18n` | re-run |

## Related code files
Create:
- `e2e/callback-chips.spec.ts` (under 200 lines; split into `callback-chips-travel.spec.ts` if longer).

Modify:
- `e2e/scene-queues-timers.spec.ts:60`: change the comment to "leaves the shelf when it is due".
- `GLOSSARY.md`: add **Callback chip**: "The code of the function a Task or Job will call, shown as one token that moves between panels; identified by its Task or Job id." _Avoid_: token, pill. Optionally extend **Task**: "a timer's Task is queued only once the Virtual Clock reaches its due time."
- `docs/system-architecture.md`:
  - `trace/` row: Trace schema v2, `CallbackInfo` as a range into the header `source`.
  - `engine/` row: callback descriptors; the patch also carries the reaction handler, the await context and the thenable `then`.
  - `host/` row: timer Tasks are queued when due, on every Virtual Clock advance.
  - `renderer/panels/` row: callback chips; the Web APIs timer cards; the FLIP ghost overlay, which animates a single step only, snaps on jumps and under reduced motion.
  - "Determinism and correctness": the frozen snapshot is `tests/golden/trace-schema-v2.json`.
- `docs/project-roadmap.md`: add an M6.3 "Callback chips (Panels)" row. Leave M2 as history.
- `README.md` "How it works": one sentence on callback chips moving between panels.

## Implementation steps
1. Write the e2e spec, reusing the step helpers from the existing specs (move them into `e2e/fixtures.ts` if they are copied twice).
2. Run the full suite: `pnpm run lint` (then check `git status` for oracle fixture rewrites), `pnpm exec oxlint .`, `pnpm exec eslint .`, `pnpm run type-check`, `pnpm exec vitest run`, `pnpm run test:oracle`, `pnpm run build-only && pnpm run check:build`, `pnpm test:e2e`.
3. Update the docs, then run the docs-manager review.

## Todo list
- [x] callback-chips e2e specs (`callback-chips.spec.ts`, `callback-chips-travel.spec.ts`, helpers in `chip-helpers.ts`)
- [x] existing e2e green; comment fix (diagram-view and scrubber specs adjusted to the new timer timing and layout)
- [x] GLOSSARY, system-architecture, roadmap, README
- [x] full gate run green

## Success criteria
The whole CI pipeline is green: checks, oracle (no new known failures) and e2e. The docs describe schema v2, the timer timing and the chips. `grep -r "schema v1 snapshot" docs` finds nothing stale.

## Risks
| Risk | L x I | Mitigation |
|---|---|---|
| Flaky ghost assertions | M x M | Assert end states; check ghost existence with `expect.poll` only; run Chrome-only where WAAPI timing matters |
| Firefox or WebKit differences in `cloneNode` styling | L x L | Ghosts reuse the same classes; checked visually per browser project |

## Security
None.

## Next steps
Diagram and 3D chips (out of scope) can reuse `chipsOf` and `CallbackInfo`.

## Unresolved questions (whole plan)
1. Sweep a 0 ms timer at `task:end` as well, so it enters the queue before the Script's Checkpoint? Current answer: no; the single rule is "at a clock advance" (phase 1).
2. RESOLVED 2026-10-21: chip only, no kind tag (kind in tooltip/aria). Callback frame shows chip only, name in tooltip. Countdown wording: "3ms left". Schema bumps to v2.
3. On a callback's stack frame, show the chip only, or the chip plus the function name? Planned: chip only, with the name in the tooltip.
4. Web APIs countdown wording: "3ms left" or "fires at 10ms"? Planned: "left".
5. Schema bump to v2 versus keeping v1 with a regenerated snapshot: v2 chosen, because the snapshot test requires it and the timing meaning changed. Confirm that this is acceptable before release.
