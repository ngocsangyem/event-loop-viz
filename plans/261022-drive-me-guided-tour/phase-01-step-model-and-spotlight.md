# Phase 1: step model, resolver, spotlight + popover

## Overview
Priority: high · Status: code done (tests written, not run; not checked in a browser). This is the foundation for all later phases.

## Requirements
- `DriveStep = { at: EventMatcher; target: DriveTarget; line?: number; title: string; body: string }`
  - `EventMatcher = { k: TraceEvent['k']; text?: string; nth?: number }`. `nth` is 1-based and defaults to 1.
  - `DriveTarget` is the closed set from plan.md.
- `resolveSteps(steps, events)` returns `{ position, step }[]`, or a list of unresolved steps. It is pure and unit-tested.
- `<DriveSpotlight>`:
  - **Overlay:** fixed and full-viewport. A hole is cut around `[data-drive-target="<target>"]`; for `source-line`, it is the CodeMirror line of `line`. The hole has an 8px pad and a 1px `--brand` outline.
  - **Popover:** `role="dialog"`, `aria-modal="false"`, labelled by the step title, with `aria-live="polite"` on the body. Placement is below, then above, then right, clamped to the viewport with a 16px gutter. On phones it is a bottom sheet.
  - **Remeasure** on step change (after `nextTick`), resize (`ResizeObserver`), scroll (capture) and font load. The target is scrolled into view (`block: 'nearest'`) before measuring.
  - **Motion:** a GSAP glide of the hole and the popover between targets, using transform only. Reduced motion jumps.
  - **Clicks:** the overlay swallows clicks outside the hole, which does nothing; Esc closes. The hole itself stays clickable.

## Related code files
- Create:
  - `src/renderer/drive/drive-step.ts` (types)
  - `src/renderer/drive/resolve-drive-steps.ts`
  - `src/renderer/drive/drive-target-rect.ts` (measure a target or a source line)
  - `src/renderer/drive/drive-spotlight.vue`
  - `src/renderer/drive/drive-popover.vue`
  - `src/renderer/drive/__tests__/resolve-drive-steps.test.ts`
- Modify (add `data-drive-target` only):
  - the panels: `call-stack-panel.vue`, `web-apis-panel.vue`, `task-queue-panel.vue`, `microtask-queue-panel.vue`, `event-loop-panel.vue`
  - `console-panel.vue`
  - the Source pane root in `editor-card.vue`

## Todo
- [x] Types + resolver + tests (matcher by `k`, `text`, `nth`; unresolved reporting)
- [x] Target attributes on the 7 regions
- [x] Rect measurement incl. CodeMirror line (`view.lineBlockAt`, mapped to the viewport)
- [x] Spotlight overlay (SVG mask), outline, GSAP glide, reduced motion
- [x] Popover: STEP 03 OF 07 label, title, body, `[P]PREV` `[N]NEXT` `[ESC]END`
- [x] Popover tokens: radius 0, no shadow, `--raised` surface, hairline border

## Success criteria
- The spotlight hole matches the target rect within 1px after resize and scroll.
- Axe reports no violations with the overlay open.
- Focus starts on the popover and returns to the DRIVE ME button on close.

## Risks
- **The CodeMirror line rect is inside a scroller.** Mitigation: measure through `view.coordsAtPos`, and remeasure on the editor's scroll.
- **The overlay could hide the dock.** Mitigation: the dock is not a target, and the popover keeps a gap equal to `--dock-h` from the bottom.

## Implementation notes
- **Target set:** the `source` target, narrowed by `line`, replaces the draft's separate `source-line` target.
- **Hole:** drawn as an evenodd SVG path (outer rect + hole), so clicks in the hole reach the page with no hit-testing code. The glide tweens the hole's x, y, w and h, which are SVG attributes (paint only, no page layout). The card glides on transform.
- **Event matching:** matchers only match visible (steppable) events.
- **i18n:** the `drive.*` strings needed by the popover live in `core-drive.ts`. Phase 2 adds the rest there.
- **Not wired yet:** nothing mounts `<DriveSpotlight>` until phase 2.
