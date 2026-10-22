# Phase 2: drive session, controls, orchestration

## Overview
Priority: high · Status: code done (tests written, not run; not checked in a browser) · Depends on: phase 1

## Requirements
- `useDriveSession({ ensureRun, player, position, view, tab, pause, stepsFor })`:
  - `start()`:
    1. `ensureRun()`. This reuses the Ask AI dock's helper: it runs the Script if there is no Trace.
    2. Resolve the steps.
    3. Pause playback.
    4. Remember the current view and force Panels.
    5. On a phone, switch to REPLAY.
    6. Seek to step 1.
  - `next()` / `prev()` seek and update the index. `end()` restores the view.
  - **Ends automatically** when the Trace is discarded (Edit), when a new Run starts, or when the Script changes.
  - **Index follows the playhead:** if the learner scrubs onto a step's position, the index follows, as `use-ai-tour.ts` does.
- `stepsFor(script, trace)` returns curated steps (phase 3) when the Script equals an example and every matcher resolves. Otherwise it returns the AI provider (phase 4).
- **Controls:**
  - `[D]DRIVE ME` in the editor/Source pane header, next to EXAMPLE.
  - `[D]DRIVE ME` in the dock trailing slot, next to TRACE and ASK AI.
- **Hotkeys:** D starts or ends the walkthrough. While driving, P and N go to Drive me instead of the Ask AI tour, and Esc ends it. The `?` sheet gets a row.
- **i18n:** `drive.*` in en/vi core (labels, progress `STEP {current} OF {total}`, end, loading, errors).

## Related code files
- Create:
  - `src/renderer/drive/use-drive-session.ts`
  - `src/renderer/drive/drive-me-button.vue`
  - `src/renderer/drive/__tests__/use-drive-session.test.ts`
- Modify:
  - `src/App.vue` (wire the session and render the spotlight)
  - `src/renderer/use-app-hotkeys.ts` (D, and P/N routing)
  - `src/renderer/shortcut-sheet.vue`
  - `src/renderer/editor-pane-header.vue`
  - `src/i18n/messages/{en,vi}/core.ts`

## Todo
- [x] Session composable + tests (start, next, prev, end; auto-end on discard or new Run; follows playhead)
- [x] Buttons + hotkeys + sheet row
- [x] View/tab save and restore
- [x] i18n en/vi

## Success criteria
- Starting with no Trace runs the Script and lands on step 1.
- Ending restores the previous view and tab.
- Keys do not fire while typing.
- Ask AI P/N still works when Drive me is not active.

## Risks
- **App.vue grows past 200 lines.** Mitigation: keep the orchestration in the composable, so App.vue only wires it.

## Implementation notes
- **Files:**
  - `use-drive-session.ts`: the state machine.
  - `use-drive-me.ts`: wires it to the app. It tracks the last loaded example and loads the curated steps.
  - `drive-me-overlay.vue`: chooses the card text by status.
  - `drive-me-button.vue`: the DRIVE ME button.
- **Where the curated steps live:** `src/examples/drive-steps/index.ts` holds the empty registry and the `CuratedDriveStep` type. Phase 3 fills it.
  - `curated-drive-steps.ts` resolves the steps and returns null if any step fails.
  - The step text is read from `drive.examples.<camelId>.<key>`.
- **No steps:** with no curated walkthrough, the card shows an "empty" notice. Phase 4 replaces this with AI generation in `useDriveMe`'s `loadSteps`.
- **Dock height:** `useAskAiDock` now also returns `dockHeight`, the bottom space the card keeps clear.
- **Esc order:** an active walkthrough ends first, then a Run in flight is cancelled.
