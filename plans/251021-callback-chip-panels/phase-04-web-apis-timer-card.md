# Phase 4: Web APIs timer card

## Context links
- Current panel: `src/renderer/panels/web-apis-panel.vue:13-22`. It shows one QueueItem per timer: `setTimeout 1` with "due 10ms".
- Model reused today: `src/renderer/scene/timer-shelf-model.ts:25-36` (`timerShelfOf`, `formatVirtualMs`). It stays as it is because the 3D view shares it.
- PendingTimer (after phases 1 and 2): `tid, requestedMs, clampedMs, repeat, dueUs, taskId?, callback?`. The start time is `dueUs - clampedMs*1000`.
- Chip: `src/renderer/panels/callback-chip.vue` and `callback-chip-model.ts` (phase 3).
- i18n: `src/i18n/messages/{en,vi}/core-panels.ts` (`panels.webApis`).

## Overview
Priority P2. Status: completed. Each pending timer becomes a card like the one in the video. The title is the API (`setTimeout`/`setInterval`). The card has a **callback** slot holding the chip and a **delay** slot with the ms value. An arrow leads out of the card to a "Browser" tag, with a countdown that shows the browser is timing it. When the timer becomes due (phase 1's `task:queue`), the card leaves and phase 5 flies the chip to the Task Queue.

## Key insights
- Everything the card shows comes from `ReplayState`: `remainingUs = max(0, dueUs - clockUs)`, `progress = 1 - remainingUs / (clampedMs*1000)`. Because it is derived from state, scrubbing and stepping back always show the right countdown. No timers run in the UI.
- Clamp: when `clampedMs !== requestedMs`, the delay slot shows `4ms` with a "raised from 1ms" note. This uses the explanation already in `explain-phrases-en.ts:87-88`.
- A 0 ms timer still shows a card briefly (one step) before it is queued. That is the video's lesson, and it follows from phase 1.
- Width: the panel sits in column 1 under the editor (`App.vue:143-160`, xl 4/12). At 375 px the slots stack: the chip row gets its own line, then the delay, then the arrow.

## Requirements
- Functional: one card per pending timer, soonest due first. This keeps the `timerShelfOf` ordering (re-sort in the card model with the same stable comparator). The card shows: the API title with `#tid` muted; the callback slot (the chip, or a generic "callback" label when there is no descriptor); the delay slot; the outbound arrow with "Browser" and a countdown such as "3ms left"; a progress bar (`role=progressbar`, `aria-valuenow`); and a repeat badge for setInterval.
- `data-testid="panel-web-apis"` stays on the list container. `e2e/visualizer-view.spec.ts:57` expects the text 'setTimeout' in it.
- Non-functional: EN/VI, light/dark (theme tokens: `--primary`, `--muted`, `--border`), reduced motion (the progress width transition turns off through the global `style.css:131-138` rule), phone width.

## Architecture / data flow
```
ReplayState.timers + clockUs --webApiCardsOf(state)--> WebApiCardModel[]
  {taskId, tid, api:'setTimeout'|'setInterval', delayMs, requestedMs, clamped:boolean,
   remaining:'3ms', progress:0..1, repeat}
chipsOf(state, source).get(taskId) -> the chip in the callback slot (place 'webapis')
web-apis-panel.vue -> TransitionGroup of <WebApiTimerCard> keyed by taskId
```
Keying the cards by `taskId` (not `tid`) makes an interval's re-arm a new card. The chip id equals the key, so phase 5 can find the source element.

## Related code files
Create:
- `src/renderer/panels/web-api-card-model.ts`: `webApiCardsOf(state)`, pure, and it reuses `formatVirtualMs`. Under 60 lines.
- `src/renderer/panels/web-api-timer-card.vue`: the card markup: header, two slots, arrow, progress. Under 120 lines.
- `src/renderer/panels/web-api-card.css`: card layout, the arrow (CSS border-arrow or an inline SVG chevron), and the progress bar. Kept separate from `panel-motion.css`, which phase 5 owns.
- `src/renderer/panels/__tests__/web-api-card-model.test.ts`.

Modify:
- `src/renderer/panels/web-apis-panel.vue`: render the cards in place of QueueList. Keep the empty state and the `panel-web-apis` testid. The `source` prop and the App wiring already exist from phase 3.
- File ownership: phase 4 does **not** touch `App.vue`, `queue-list.vue` or `panel-motion.css`, because phase 5 owns them and may run in parallel.
- `src/i18n/messages/{en,vi}/core-panels.ts` (`panels.webApis.*`):
  - `callback`: 'callback' / 'callback'
  - `delay`: 'delay' / 'độ trễ'
  - `browser`: 'Browser' / 'Trình duyệt'
  - `left`: '{left} left' / 'còn {left}'
  - `clamped`: 'raised from {requested}ms' / 'tăng từ {requested}ms'
  - `repeats`: 'repeats' / 'lặp lại'
  - `info`: reword to "Timers the browser is counting down. When one is due, its callback moves to the Task Queue." (VI equivalent)

Delete: none (`QueueList` is still used by the other panels).

## Existing tests that break and why
| Test | Why | Fix |
|---|---|---|
| e2e `visualizer-view.spec.ts:57` | Expects 'setTimeout' inside `panel-web-apis` | Keep the title text inside the testid container, so it passes unchanged |
| e2e `responsive-layout.spec.ts` | Only if it measures the Web APIs panel height or overflow | Re-run. Cards wrap; there is no horizontal overflow |
| e2e `accessibility.spec.ts` | Runs axe on the panels | The progressbar needs an accessible name (`aria-label` = the countdown text) |

## Implementation steps
1. Card model and unit tests: ordering, remaining time, progress clamped to 0..1, the clamp flag, and an interval re-arm giving a new key.
2. Card component and CSS (`grid` at sm and up, slots stacked below sm).
3. Swap the panel body. Keep the empty state.
4. i18n EN/VI.
5. Visual check in light and dark at 375, 768 and 1440 px, in EN and VI. The VI strings are longer, so make sure nothing clips.

## Todo list
- [x] web-api-card-model with tests
- [x] web-api-timer-card.vue and css
- [x] web-apis-panel uses the cards, source prop, App wiring
- [x] i18n EN/VI
- [ ] responsive and theme check; axe passes

## Success criteria
With `setTimeout(() => console.log('2000ms'), 2000)`, stepping to `timer:init` shows a card titled `setTimeout`, the chip `() => console.log('2000ms')`, delay `2000ms`, and "Browser · 2000ms left". At the timer's `task:queue` the card is gone and the Task Queue shows the same chip id.

## Risks
| Risk | L x I | Mitigation |
|---|---|---|
| Many timers make the panel very tall | M x M | Show at most 6 cards with a "+N more" line, the same pattern as `timerShelfOf(…, capacity)`. The chip model still knows the hidden ones, and phase 5 snaps chips whose source element is missing. |
| The arrow reads poorly in dark mode | L x L | Use `currentColor` from the muted foreground token |

## Security
None.

## Next steps
Phase 5 measures `[data-chip-id]` inside these cards as the travel source.

## Unresolved questions
- Show the countdown as virtual ms left ("3ms left") or as the due time ("fires at 10ms")? Planned: "left", with the due time in the tooltip.
