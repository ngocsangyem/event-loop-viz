# Drive me: a guided, highlighted walkthrough of a Run

Status: **approved, all 4 phases coded; tests written, not run; not checked in a browser** · Created 2026-10-22

## Goal
- A `[D]DRIVE ME` control starts a step-by-step walkthrough.
- Each step:
  - moves the replay to one Trace event;
  - dims the page and spotlights the element that matters (a Source line, a queue lane, the call stack, the console);
  - shows a popover explaining it.
- `[P]PREV` / `[N]NEXT` step through. `Esc` ends the walkthrough.
- **Example Scripts:** hand-written steps, in en and vi.
- **Custom Scripts** (or an edited example): a separate AI call generates the steps.

## User decisions (2026-10-22)
| Question | Answer |
|---|---|
| Highlight engine | **Own spotlight component**, not driver.js |
| AI for custom Scripts | **Own button + own AI flow**, independent of the Ask AI chat |
| Curated content languages | **en + vi** for all 9 examples |

## Phases
| # | Phase | File | Status |
|---|---|---|---|
| 1 | Step model, resolver, spotlight + popover | [phase-01](phase-01-step-model-and-spotlight.md) | code done, not yet run |
| 2 | Drive session: controls, hotkeys, view/tab/Run orchestration | [phase-02](phase-02-drive-session-and-controls.md) | code done, not yet run |
| 3 | Curated steps for the 9 examples (en/vi) | [phase-03](phase-03-curated-example-steps.md) | code done; steps checked against simulator Traces |
| 4 | AI-generated steps for custom Scripts | [phase-04](phase-04-ai-generated-steps.md) | code done, not yet run |

Phases 3 and 4 both depend on phase 1's step model. They own disjoint files, so they can run in parallel after phase 2.

## Key design points
- **Steps anchor to Trace events by matcher, not by position.** For example, a step is `{ k: 'console', text: 'promise 1' }`, or "2nd `job:begin`". This keeps curated steps valid if the engine changes how many events it emits. A test runs every example and asserts that every step resolves.
- **Targets are a closed set:**
  - `source-line`
  - `call-stack`
  - `web-apis`
  - `task-queue`
  - `microtask-queue`
  - `event-loop`
  - `console`

  Each maps to a stable `data-drive-target` attribute on existing elements. The spotlight never relies on CSS classes or test ids.
- **Spotlight look:** an SVG mask overlay in `--background` at ~70% with a rectangular hole, plus a 1px `--brand` outline. Radius 0, no shadow, mono labels. The motion uses GSAP for the hole's glide between targets: transform only, and none under reduced motion.
- **While driving:**
  - playback pauses;
  - the view is forced to Panels and restored afterwards;
  - the phone switches to the REPLAY tab;
  - the Trace panel stays as the user left it.
- **The Trace and `ObservableEntry` are untouched.** Everything is renderer-only.

## Out of scope
- Driving the Diagram or 3D views.
- Persisting progress across reloads.
- Sharing a walkthrough by link.

## Confirmed follow-up decisions (2026-10-22)
1. `[D]DRIVE ME` goes in **both** the Source/Script pane header and the dock.
2. An edited example keeps its curated steps while every matcher resolves. It falls back to AI only when a matcher fails.
3. With no API key, open the existing Ask AI settings dialog.
