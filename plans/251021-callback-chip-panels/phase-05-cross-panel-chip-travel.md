# Phase 5: chips travel across panels

## Context links
- Layout: `src/App.vue:142-172`. The panels are separate cards in a grid: col 1 Editor and Web APIs; col 2 Call Stack and Console; col 3 Task Queue, Microtask Queue and Event Loop. On a phone they form one column.
- In-list motion today: `src/renderer/panels/queue-list.vue:22` (TransitionGroup `queue-item`), `panel-motion.css:5-34`.
- Motion settings found:
  - OS `prefers-reduced-motion`: global kill-switch at `src/style.css:131-138`, CSS blocks in `panel-motion.css:5,41`.
  - Shared reactive flag `usePrefersReducedMotion()` at `src/renderer/scene/scene-motion.ts:32-42`.
  - Diagram precedent at `src/renderer/diagram/event-loop-diagram.vue:76-87`: only the next event forward animates; seeking and scrubbing show the still picture.
  - Playback speed: `src/renderer/use-playback.ts:6-13` (`stepIntervalMs`; 125 ms at 4x), internal to `transport-bar.vue:34`, exposed at `:45`.
  - The app has no separate in-app motion setting.
- Step semantics: `player.next/prev` (`src/player/player.ts:28-29`). `sameView` skipping in `App.vue:105-109` and `use-playback.ts:15-26`.
- Editor origin: the current event's `loc` is drawn as `.cm-source-highlight` (`src/renderer/source-highlight.ts:16-19`). For `timer:init` and `job:enqueue` that is the call site, so the chip can leave from the highlighted code without any new editor API.

## Overview
Priority P2. Status: completed. On a single step, a chip that changes container flies from its old place to its new one: editor -> Web APIs card, editor -> Microtask/Task Queue, Web APIs card -> Task Queue, queue -> Call Stack. Jumps (scrubber, Task/Tick jumps, Start/End, AI tour) snap. Reduced motion snaps.

## Options evaluated
| Technique | Verdict |
|---|---|
| **FLIP ghosts in a fixed overlay** (measure `[data-chip-id]` before and after the patch; clone into `position:fixed`; WAAPI translate) | **Picked.** The real chips stay in their panels, which keeps them accessible and lets e2e query them. The overlay is short-lived. It matches the WAAPI, no-residue style of `scene-motion.ts:44-76`. |
| View Transitions API (`view-transition-name` per chip) | Rejected. Every write to the playhead (transport, scrubber, event list, keyboard, AI tour) would need to go through `startViewTransition`. Each step snapshots the whole page, including CodeMirror. The overlay swallows clicks for the length of the transition, which would make fast stepping and Playwright clicks flaky. Steps at 4x (125 ms) would keep cancelling each other. |
| A permanent chip layer that positions every chip over slots | Rejected. It needs constant re-measuring (scroll, resize, panel growth), and chips would leave the list semantics, which hurts accessibility. |
| Vue `TransitionGroup` | Cannot move an element between containers. It stays in use for moves inside a list. |

## Key insights
- **Planning comes from state, measuring from the DOM.** `chipsOf(oldState)` and `chipsOf(newState)` (phase 3) give `id -> place`. A chip travels when its place changed, or when it is new in a place reachable from the editor (`webapis`, `taskq`, `microq`). This plan is computed before the patch, so the rows that will receive a chip can be marked in advance.
- **Arriving rows skip their enter transform.** `.queue-item-enter-from` applies `translateY(-10px) scale(.96)` (`panel-motion.css:13-16`), which would skew the measured target rect. QueueList binds class `chip-arriving` on rows whose id is in the arriving set, and CSS turns their enter transform off. The arriving set is provided through `provide/inject` from the travel layer.
- **Single-step detection** is a pure function: `isSingleStep(player, from, to, sameView)`. It is true when `to` is reached from `from` by one `next` (skipping states where `sameView` holds, at most 200 hops), or when `to === player.prev(from)`. Everything else is a jump.
- **Duration**: `travelMs = clamp(0.85 * stepIntervalMs(speed), 160, 450)` while playing, and 450 for a manual step. A new step finishes the flights in progress at once: it removes the ghosts and shows the targets before measuring.
- **Off-screen**: if the source or target rect does not intersect the viewport (common on a phone, where the panels stack), that chip snaps and gets the arrival pulse instead.
- **Backward steps** use the same FLIP, which is direction-agnostic: the chip flies from the stack back to the queue. A chip that disappears into the editor on a backward step simply leaves (it fades out).
- **Leaving chips**: when a callback frame pops, the chip leaves with its row (the existing `queue-item-leave` transition). Nothing flies to the console. The console line appearing in the same step is enough, and it matches the video's "gone".

## Requirements
- Functional: animate the moves listed above for one step forward or back. Snap on jumps, under reduced motion, for more than 6 simultaneous travellers, and when either rect is off-screen. Ghosts never catch pointer events.
- Non-functional: no layout thrash. Measure only `[data-chip-id]` elements (a few dozen at most), once before and once after the patch. No state is left after an animation. Works in EN/VI, light/dark and at phone width.

## Architecture / data flow
```
watch(position, flush:'pre')  [chip-travel-layer.vue]
  finish running flights
  single = isSingleStep(...) && !reducedMotion
  plan = diffChipPlaces(chipsOf(prev), chipsOf(next))      -> moved[], entered[]
  arriving.value = ids in plan                                -> QueueList binds .chip-arriving
  first = rects of [data-chip-id] for moved ids               (old DOM)
nextTick / flush:'post'
  last = rects of [data-chip-id] for planned ids              (new DOM)
  origin for entered = first rect of .cm-source-highlight     (new DOM: highlight = event loc)
  for each traveller with both rects on-screen:
     ghost = target.cloneNode(true) in the overlay, fixed at `first`
     target.animate([{opacity:0},{opacity:0}], {duration})    (hidden while the ghost flies, no residue)
     ghost.animate([translate(first), translate(last)], {duration, easing: MOTION_EASE})
     onfinish/oncancel: remove ghost
  others: target.animate(pulse) unless reduced motion
  arriving.value = empty after the flights finish
```

## Related code files
Create:
- `src/renderer/panels/chip-step-detection.ts`: `isSingleStep(player, from, to, sameView?)`. Pure; takes a minimal player interface `{next, prev}`. Under 50 lines.
- `src/renderer/panels/chip-travel-plan.ts`: `diffChipPlaces(prev: Map, next: Map)` returns `{moved, entered}` and caps the count. Pure. Under 60 lines.
- `src/renderer/panels/use-chip-travel.ts`: measuring, ghost creation, WAAPI, cancel. Under 150 lines.
- `src/renderer/panels/chip-travel-layer.vue`: the overlay root (`fixed inset-0 pointer-events-none z-30`, `aria-hidden="true"`). Takes the props `player, position, sameView, source, travelMs`, provides the arriving set, and calls `useChipTravel`.
- `src/renderer/panels/chip-travel-keys.ts`: the InjectionKey for the arriving set.
- Tests: `src/renderer/panels/__tests__/chip-step-detection.test.ts` and `chip-travel-plan.test.ts`.

Modify:
- `src/renderer/panels/queue-list.vue`: inject the arriving set (optional; default empty) and bind `chip-arriving`.
- `src/renderer/panels/panel-motion.css`: `.queue-item-enter-from.chip-arriving { transform:none; opacity:1 }`, and the `@keyframes` used by the arrival pulse (inside the `no-preference` block).
- `src/renderer/transport-bar.vue:45`: add `speed` (or `stepMs`) to `defineExpose`.
- `src/App.vue`: mount `<ChipTravelLayer v-if="view === 'panels' && player" …>` next to the grid. Pass `travelMs` computed from `transport.value?.speed` and `playing`.

File ownership versus phase 4: phase 5 owns `App.vue`, `queue-list.vue`, `panel-motion.css` and `transport-bar.vue`. Phase 4 owns the web-api-card files and `web-apis-panel.vue`. The Web APIs chip is a plain `CallbackChip` with `data-chip-id`, so phase 5 needs no change there.

## Existing tests that break and why
| Test | Why | Fix |
|---|---|---|
| e2e `playback.spec.ts`, `scrubber.spec.ts`, `keyboard-only.spec.ts` | Ghosts could intercept clicks | They cannot: `pointer-events:none` and `aria-hidden`. Re-run to confirm. |
| e2e `accessibility.spec.ts` | Duplicate text in ghosts | The overlay is `aria-hidden`, and ghosts drop the `id` and `data-testid` attributes of their clones |
| `src/renderer/__tests__/use-playback.test.ts` | Only if the exposed API changes shape | Additive expose only |

## Implementation steps
1. `chip-step-detection.ts` with tests: next, prev, sameView skip, Task jump = false, seek = false.
2. `chip-travel-plan.ts` with tests: moved across places; entered from the editor only for `webapis|taskq|microq`; the cap.
3. `use-chip-travel.ts`: implement the flow above. Strip `id` and `data-testid` from ghost clones. Cancel everything when the component unmounts or the view changes.
4. Layer component, provide/inject, QueueList class, CSS.
5. Expose the transport speed and wire `travelMs` in App.
6. Manual checks: the busy-wait, await-vs-then and message-channel-vs-timeout examples at 1x and 4x; Back; the scrubber; reduced motion (DevTools emulation); a 375 px phone.

## Todo list
- [x] step detection with tests
- [x] travel plan with tests
- [x] use-chip-travel (measure, ghost, WAAPI, cancel)
- [x] overlay layer, provide/inject, QueueList arriving class, CSS
- [x] transport speed expose, App mount
- [ ] manual matrix: speeds, back, scrub, reduced motion, phone, dark (not run; needs a browser, left to the e2e phase)

## Success criteria
- One step from `timer:init` shows a ghost travelling from the editor highlight to the Web APIs card. One step to the timer's `task:queue` shows a ghost from the card to the Task Queue. After every flight, `document.querySelectorAll('.chip-ghost').length === 0`.
- A scrubber jump or Go-to-end creates no ghosts.
- With `reducedMotion: 'reduce'`, no `Element.animate` calls happen. Checked in e2e in phase 6.

## Risks
| Risk | L x I | Mitigation |
|---|---|---|
| Rects are measured mid-transition in the source list | M x M | Measure first rects in pre-flush, before Vue patches; the old DOM is stable then |
| The sticky transport bar covers the target | M x L | Ghosts are z-30 (the bar is z-10), so they fly above it |
| Autoplay at 4x cancels flights constantly | M x L | travelMs scales to the step interval; a cancel snaps cleanly |
| A chip id appears twice in the DOM | L x M | Phase 3's unit test, plus a dev-only `console.warn` in `use-chip-travel` |
| Many chips (loop with 100 `.then`s) | M x M | Cap at 6 travellers; the rest snap |

## Security
None (clones of text-only nodes).

## Next steps
Phase 6 e2e covers travel and snapping.

## Unresolved questions
- Should the chip also fly from the stack to the Console when a `console.log` inside it runs? Not planned (YAGNI). The video shows the log appearing.
