# End-to-end suite

Playwright tests that drive the built app the way a learner does. Story numbers refer to the
user stories in the spec (1 to 56) plus story 57, the per-step explanation amendment.

```sh
pnpm exec playwright test                    # all browsers (dev server locally, preview on CI)
pnpm exec playwright test --project=chromium # one browser
```

## Determinism rules

- No fixed sleeps. Waits are `expect(...)` auto-retries on visible state.
- Playback speed is driven by `page.clock.install()` + `runFor`, never real time.
- Runs that must not end on their own (`for (;;) {}`) raise the node Budget so far that it cannot
  trip before Cancel or the watchdog, so the outcome does not depend on CPU speed.
- Timing-sensitivity uses the Virtual Clock (`Date.now` inside the Script), not wall-clock time.
- The Playwright config has `retries: 0` on CI too: a failure is a bug, not noise.
- Tap-target sizes compare with a 0.5 px tolerance because layout can yield 43.99 for 44.

## Visual baselines (Scene theme snapshots)

`scene.spec.ts` compares a screenshot of the Scene per theme. Baselines are Chrome-only and live
under `e2e/__screenshots__/<platform>/` (`{platform}` is in `snapshotPathTemplate`). Only a
`darwin` baseline is committed. On any platform without a baseline (Linux CI) the test still
asserts the theme tokens flip with the color scheme, records a `snapshot-skipped` annotation in the
report, and skips only the pixel comparison. To add one, run
`pnpm exec playwright test --project=chromium scene.spec --update-snapshots` on that platform and
commit the new folder.

## Traceability: story to test

Test names are `file › title`. Stories 52 to 56 are maintainer stories and are covered by unit,
oracle or lint tests (non-e2e).

| # | Story | Test |
|---|-------|------|
| 1 | Paste any Script | `vue.spec.ts › steps through a Trace to the end and shows the Run Observable Output` |
| 2 | Highlighting and line numbers | `learner-stories.spec.ts › the editor shows line numbers and syntax-highlighted tokens` |
| 3 | Run button and shortcut | `editor.spec.ts › a keyboard shortcut runs the Script` |
| 4 | Built-in examples | `examples.spec.ts › loading an example and running it produces a Trace` |
| 5 | Syntax error with line and column | `error-reporting.spec.ts › a syntax error is marked at its line and column and creates no Trace` |
| 6 | Responsive during a long Run | `worker-run.spec.ts › the UI stays responsive while a Run computes` |
| 7 | Progress and cancel | `worker-run.spec.ts › Cancel ends the Run without a Trace` |
| 8 | Editing discards the Trace | `editor.spec.ts › Edit discards the Trace and disables the controls until the next Run` |
| 9 | Read-only replay with banner | `editor.spec.ts › typing during replay is blocked and the read-only banner is shown` |
| 10 | Pre-run Unsupported API notice | `error-reporting.spec.ts › a Script using fetch shows the pre-run notice and the replay console shows the error` |
| 11 | UnsupportedApiError names the API | `error-reporting.spec.ts › a Script using fetch shows the pre-run notice and the replay console shows the error` |
| 12 | Error acts like any uncaught exception | `learner-stories.spec.ts › after an Unsupported API throws, the rest of the Script still runs` |
| 13 | Supported APIs discoverable | `error-reporting.spec.ts › the supported-API list is reachable from the UI` |
| 14 | Play and pause | `playback.spec.ts › play advances, pause freezes, play stops at the last event` |
| 15 | Step forward | `vue.spec.ts › steps through a Trace to the end and shows the Run Observable Output` |
| 16 | Step back | `vue.spec.ts › Prev returns to the earlier event position and console content` |
| 17 | Tick jumps | `scrubber.spec.ts › Tick and Task jumps by button land on job:begin and task:begin` |
| 18 | Task jumps | `scrubber.spec.ts › Tick and Task jumps by keyboard (Shift and Alt arrows)` |
| 19 | Jump to start and end | `playback.spec.ts › keyboard: Space, arrows, Home and End` |
| 20 | Speed control | `playback.spec.ts › 4x covers the same span in a quarter of the time` |
| 21 | Keyboard shortcuts | `keyboard-only.spec.ts › load an example, run, step, jump and play with the keyboard alone` |
| 22 | Scrubber with family markers | `scrubber.spec.ts › the scrubber shows a marker for each event family of the Run` |
| 23 | Playback stops at the end | `playback.spec.ts › play advances, pause freezes, play stops at the last event` |
| 24 | Instant backward stepping on long Traces | `performance-settings.spec.ts › a long Trace renders only the rows in view and scrolls to the end` |
| 25 | Source range highlighted | `source-highlight.spec.ts › stepping moves the source highlight to the line being evaluated` |
| 26 | Highlight scrolls into view | `source-highlight.spec.ts › the highlight scrolls into view when it is off-screen` |
| 27 | Distinct cause highlight | `source-highlight.spec.ts › a promise Job highlights the await or then that scheduled it as the cause` |
| 28 | No highlight without a source location | `source-highlight.spec.ts › a Checkpoint event shows no source highlight` |
| 29 | Call stack, one frame per function | `scene.spec.ts › stepping through nested calls pushes and pops frames in the Scene` |
| 30 | Microtask queue with Job kinds | `scene-queues-timers.spec.ts › a Job waits in the microtask queue, then moves to the run pad when it begins` |
| 31 | Task queue and timers with due time | `scene-queues-timers.spec.ts › a timer shows its due time on the shelf and leaves it when it fires` |
| 32 | Virtual Clock time | `scene-queues-timers.spec.ts › a timer shows its due time on the shelf and leaves it when it fires` |
| 33 | Suspended awaits | `scene-promises-awaits.spec.ts › a suspended async function waits on its promise and resumes at await:resume` |
| 34 | Items animate between regions | `scene-transitions.spec.ts › items animate between parts when the user steps` |
| 35 | Same Scene however you arrive | `scene-transitions.spec.ts › the same position gives an identical Scene whether played, stepped, scrubbed or stepped back` |
| 36 | Reduced motion | `scene-transitions.spec.ts › with reduced motion the Scene changes state without any animation` |
| 37 | Event list synced to playhead | `event-detail.spec.ts › show all events makes Bookkeeping Events steppable` |
| 38 | Click an event to jump | `event-detail.spec.ts › selecting an event shows its explanation, spec link and cause` |
| 39 | Family filter chips | `event-detail.spec.ts › family chips hide and show events` |
| 40 | Show all events toggle | `event-detail.spec.ts › show all events makes Bookkeeping Events steppable` |
| 41 | Detail pane (spec link, payload, cause) | `event-detail.spec.ts › selecting an event shows its explanation, spec link and cause` |
| 42 | Console panel with `Uncaught` lines | `learner-stories.spec.ts › the console shows unhandled rejections as Uncaught (in promise) lines` |
| 43 | Console uses the canonical format | `learner-stories.spec.ts › console values use the canonical text format` |
| 44 | Deterministic Halt with named Budget | `learner-stories.spec.ts › infinite loop Halt › the same Script halts at the same point every time` |
| 45 | Halted Trace stays replayable | `learner-stories.spec.ts › infinite loop Halt › the partial Trace of a halted Run can be replayed backward and forward` |
| 46 | Timing-sensitive badge | `learner-stories.spec.ts › timing-sensitive badge › a Run whose timer is due as compute ends is flagged` |
| 47 | Watchdog message | `worker-run.spec.ts › the watchdog stops a stuck Run and explains that no Trace exists` |
| 48 | Adjustable Budgets | `performance-settings.spec.ts › lowering the node Budget halts the infinite loop earlier and the banner names it` |
| 49 | Share link carries Script and settings | `performance-settings.spec.ts › changed Budgets travel in a share link` |
| 50 | Identical Trace from a share link | `share.spec.ts › a share link opened in a fresh context reproduces the Trace and output` |
| 51 | Seeded `Math.random` | `learner-stories.spec.ts › Math.random is seeded, so re-running the same Script repeats its output` |
| 52 | Oracle fixtures pass (non-e2e) | `oracle/oracle.test.ts › Observable Output matches the Chrome Oracle` |
| 53 | Skipped Fixtures keep an expectation (non-e2e) | `src/runner/__tests__/skipped-fixtures.test.ts › Skipped Fixtures keep a simulator-side expectation` |
| 54 | Oracle Chrome major guard (non-e2e) | `oracle/oracle-version-guard.test.ts › every Golden was recorded by the Chrome major of the Host Profile the simulator reports` |
| 55 | Manual Job execution guard (non-e2e) | `src/runner/__tests__/run-script.test.ts › runs engine262 with manual Job execution: Jobs only run at the Checkpoint` |
| 56 | Renderer cannot import engine or host (non-e2e) | `src/__tests__/import-boundaries.test.ts › import boundaries` |
| 57 | Per-step explanation | `event-detail.spec.ts › selecting an event shows its explanation, spec link and cause`; `keyboard-only.spec.ts › the current step explanation is announced through a live region`; template coverage (non-e2e): `src/player/__tests__/explain-event.spec.ts › has a clean explanation template for every Trace Event kind in schema v1` |

Cross-cutting specs without a single story: `accessibility.spec.ts` (axe in both themes),
`responsive-layout.spec.ts` (phone width, tap targets), `keyboard-only.spec.ts` (no-mouse flow).
