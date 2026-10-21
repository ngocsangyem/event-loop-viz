# Phase 3: replay state and panel chips (static)

## Context links
- State: `src/player/replay-state.ts:10-30` (QueuedTask, QueuedJob, PendingTimer), `:52-84` (ReplayState), `:116-130` (`cloneReplayState`: entries are shared, so the reducer must never mutate an entry in place).
- Reducer: `src/player/apply-event.ts` (140 lines).
- Panels: `src/renderer/panels/queue-list.vue` (QueueItem), `task-queue-panel.vue:14-22`, `microtask-queue-panel.vue:14-20`, `call-stack-panel.vue:14-26`, `panel-view-model.ts:11-32` (visibleFrames, panelSignature).
- Mount point: `src/App.vue:159-171`. The panels get `:state`. `trace` is available in App (`:99`).
- i18n: `src/i18n/messages/{en,vi}/core-panels.ts` (`taskSource`, `jobKind`).
- AI: `src/renderer/ai/build-run-context.ts:84-91` (`summarizeState`).
- Frame order measured by a probe (temporary test, deleted afterwards):
  - timer Task: `script` (root) -> `(anonymous)`
  - `.finally`: root -> `thenFinallyClosure` (builtin) -> `(anonymous)`
  - await: root -> `fulfilledClosure` (builtin) -> `foo` (same frameId as before the await)
  - port: root -> `MessagePort message dispatch` (builtin) -> `(anonymous)`

## Overview
Priority P2. Status: completed. Rows in the queues, the running row, and the call-stack frame of a running callback show the callback's code instead of "Timer", "Promise reaction", "queueMicrotask" or "(anonymous)". No movement yet: phase 5 adds that.

## Key insights
- **Callback frame rule** (in the reducer): after `task:begin` or `job:begin` of a Task or Job that has a chip, the first `frame:push` is the job root (non-builtin, labelled `script`) and is skipped. The callback frame is the next non-builtin push. For a `builtin` callback, it is the next push of any kind. A `frame:pop` of that frame marks the callback `done`. The Script Task and rejection-notification Tasks have no chip.
- **Where the chip is** for a running chip id: on its stack frame once that frame is pushed, then gone once it pops. Before the frame is pushed, it sits on the running row of its queue panel. So a step reads: queue row -> (task:begin) running row -> (frame:push) stack -> (frame:pop) gone. Today the running row stays in the queue panel (`task-queue-panel.vue:19-21`). It keeps doing so, but after the chip moves to the stack it shows only the source label and "running". `e2e/visualizer-view.spec.ts:18` checks `Script` on the running row, which still holds.
- One chip id lives in exactly one place at a time. Phase 5's travel relies on this: two `[data-chip-id=X]` elements in the DOM would be a bug. A unit test checks it.
- Text is resolved in the renderer: `header.source.slice(loc.start, loc.end)`. The player stays string-free and framework-free. Display text: collapse whitespace to single spaces, then cut at 120 characters (bounds the DOM). The CSS `truncate` class then gives a single-line ellipsis at any width. The full text goes to `title` and to the accessible name.
- `panelSignature` already changes at every chip move (tasks, jobs, timers, frames). Prove it with a test rather than adding fields.

## Requirements
- Functional: the Task Queue, Microtask Queue and Call Stack (callback frame) show chips. Rows show the chip only, as the video does (user decision 2026-10-21): no kind tag. The kind label ("Timer", "Promise reaction", …) moves into the chip's tooltip and accessible name, so screen readers still hear it. `e2e/visualizer-view.spec.ts:58` (`'Promise reaction'` text) must be updated to assert the chip text instead. When there is no descriptor, the row falls back to today's kind label.
- Non-functional: EN and VI, light and dark (chip colours use theme tokens only), phone width (the chip shrinks with `min-w-0 truncate`). Files stay under 200 lines.

## Architecture / data flow
```
Trace event --applyEvent--> ReplayState
  timer:init      -> PendingTimer {.., taskId?, callback?}
  task:queue      -> QueuedTask {.., tid?, callback?}
  job:enqueue     -> QueuedJob {.., callback?}
  task/job:begin  -> runningCallback = {chipId, callback, frameId:null, rootSeen:false, done:false} | null
  frame:push/pop  -> runningCallback replaced (never mutated) per the callback frame rule
  task/job:end    -> runningCallback = null
ReplayState + header.source --chipsOf()--> Map<chipId, ChipModel{id, text, full, kind, place}>
  place: 'webapis' | 'taskq' | 'microq' | 'taskq-running' | 'microq-running' | 'stack'
panels: QueueItem.chip?: ChipModel -> <CallbackChip data-chip-id=id>
```

## Related code files
Create:
- `src/player/running-callback.ts`: the `RunningCallback` type and pure `beginCallback` / `onFramePush` / `onFramePop` helpers used by the reducer. This keeps `apply-event.ts` under 200 lines.
- `src/renderer/panels/callback-chip-model.ts`: `chipText(info, source, t)` returns `{text, full}`; `chipsOf(state, source)` returns a Map; it also holds the console-method prefix and await formatting. Pure, no Vue. Under 120 lines.
- `src/renderer/panels/callback-chip.vue`: a monospace pill showing `text`, with `title=full`, `aria-label` from `t('panels.chip.label', {code: full})` and `data-chip-id`. Rendered as text only, no `v-html`.
- `src/renderer/panels/__tests__/callback-chip-model.test.ts`.
- `src/player/__tests__/running-callback.test.ts`: real traces from `runScript` for each kind.

Modify:
- `src/player/replay-state.ts`: the new fields; `runningCallback: RunningCallback | null` in the initial state. The clone copies the reference, which is safe because the reducer always replaces it.
- `src/player/apply-event.ts`: fold `taskId` and `callback` on timer:init, `callback` on task:queue and job:enqueue; call the running-callback helpers on begin, push, pop and end.
- `src/renderer/panels/queue-list.vue`: `QueueItem.chip?: ChipModel`; when set, render `<CallbackChip>` in place of the label; `label` goes into the chip's title/aria-label only.
- `src/renderer/panels/task-queue-panel.vue`, `microtask-queue-panel.vue`, `call-stack-panel.vue`: new prop `source: string`; attach chips from `chipsOf`. In the call-stack panel, the callback frame's item gets the chip.
- `src/App.vue:159,164,168,169`: pass `:source="trace?.header.source ?? ''"` to all four list panels. `web-apis-panel.vue` only declares the `source` prop in this phase; phase 4 uses it. This way phases 4 and 5 never both edit `App.vue`.
- `src/i18n/messages/{en,vi}/core-panels.ts`: `panels.chip.label` ('Callback {code}' / 'Callback {code}'), `panels.chip.awaitResume` ('{fn} after await' / '{fn} sau await'), `panels.chip.line` ('line {line}' / 'dòng {line}').
- `src/renderer/ai/build-run-context.ts:86-89`: add the callback text, clipped to 80 characters, to the task and job lines through `chipText`, so the AI talks about the same code the learner sees.
- `src/renderer/panels/__tests__/panel-view-model.test.ts`: the signature changes at each chip move.

## Existing tests that break and why
| Test | Why | Fix |
|---|---|---|
| `src/renderer/ai/__tests__/build-run-context.test.ts` | Only if it snapshots task or job lines that now carry callbacks; it currently uses only the Script task (`:20`) | Update the expected strings if needed |
| `src/player/__tests__/real-traces.test.ts` | `stateAt == foldFromZero` compares the whole state, and both sides gain `runningCallback` | No change expected; the v1 traces fold to `null` |
| `src/player/__tests__/state-at.test.ts` | Compares single fields only | No change expected |
| e2e `visualizer-view.spec.ts:58` | Needs the 'Promise reaction' text | Update: assert the chip text (e.g. `() => console.log(1)`) |

## Implementation steps
1. Write `running-callback.ts` with unit tests on hand-built events: root skip, builtin skip, builtin-kind, done on pop, null for Script Tasks.
2. Reducer and state fields. Check `real-traces` and `seek-performance` still pass.
3. `callback-chip-model.ts`: text extraction, whitespace collapse, cut to 120 characters; await text via i18n; builtin `console.` prefix; place resolution. Test: one id in exactly one place, checked at every position of every example script, using traces from `runScript`.
4. `callback-chip.vue`, `queue-list.vue` slot, and the three panels. Wire `source` in App.
5. i18n EN/VI. Check parity: `src/i18n` has a schema with English as the reference, and type-check catches missing VI keys.
6. AI context lines.
7. Gates: type-check, vitest, lint, a manual pass in light and dark at 375 px in EN and VI.

## Todo list
- [x] running-callback helper and tests
- [x] ReplayState fields and reducer
- [x] chip model and tests (one place per id)
- [x] CallbackChip component, QueueList chip slot, 3 panels, App wiring
- [x] i18n EN/VI
- [x] AI context lines
- [x] gates green

## Success criteria
With the example `await-vs-then`, stepping shows chips for: the `.then` callback text in the Microtask Queue; the await continuation as "`f` after await"; and the same chip on the stack frame while it runs. No row shows "(anonymous)" for user callbacks. Unit test: for all examples at all positions, every chip id appears exactly once.

## Risks
| Risk | L x I | Mitigation |
|---|---|---|
| The frame rule picks the wrong frame after an engine262 bump | M x M | `running-callback.test.ts` uses real traces per kind, so a bump that changes frames fails loudly |
| A huge function makes the DOM heavy | L x L | Cut at 120 characters, plus the CSS ellipsis |
| Learners lose the kind at a glance | M x L | Kind in tooltip + aria-label; chip colour per queue panel |

## Security
Text binding only (no `v-html`). The Script is the user's own and stays local.

## Next steps
Phase 4 (Web APIs card) and phase 5 (travel) both build on `CallbackChip` and `chipsOf`.

## Unresolved questions
- Should the call-stack frame show the chip only, or the chip plus the function name for named functions? Planned: chip only, with the name in the tooltip.
