# design-sync notes

## Decisions (user-confirmed 2026-10-21)

- No React, react-dom, veaury or any React adapter anywhere in the repo. The user rejected both a React
  rewrite and a Vue→React bridge.
- The design system is written fresh in Vue as native custom elements (`defineCustomElement`, `.ce.vue`)
  in `design-system/`. It does not reuse the app's SFCs; the app (`src/`) is unchanged by it.
- Source shape: neither `storybook` nor the converter's `package` shape (both assume React). The upload
  layout is produced off-script: `_ds_bundle.js` = the custom-element IIFE (`window.ELV`, registers every
  `elv-*` tag on load), `styles.css` imports `tokens/tokens.css` (copied from `docs/design/tokens.css`) and
  the Google Fonts `@import`. Gates still apply: validate clean + every preview graded.
- Not ported (documented for the design agent, not built): running a Script (engine262 Worker), a live
  Player/scrubber, cross-panel chip flights, page-wide hotkeys, Ask AI network calls, the whole App shell.

## Custom-element facts verified in the spike

- Build: `pnpm exec vite build --config design-system/vite.config.ts` → `design-system/dist/elv.js`
  (~86 kB, Vue bundled, gzip ~33 kB). Dev playground: launch config `design-system` (port 5180).
- Tokens (`var(--*)`) and inherited fonts reach into the shadow roots; each element's `<style>` is
  inlined into its shadow root by `@vitejs/plugin-vue` `customElement: true`.
- Arrays/objects must be set as DOM properties (`el.items = [...]`); strings/numbers/booleans work as
  attributes. Native slots only (`slot="actions"`), no scoped slots.
- `TransitionGroup` enter/leave/move animations work inside the shadow root.

## Pipeline (off-script, verified 2026-10-22)

1. `pnpm exec vite build --config design-system/vite.config.ts` → `design-system/dist/elv.js`
2. `node design-system/scripts/emit-ds-bundle.mjs` → `ds-bundle/` (cards, header, README, `.ds-build-meta.json`)
3. `node .ds-sync/package-validate.mjs ./ds-bundle` — must exit 0 (staged scripts; `.ds-sync/` needs
   `npm i playwright@1.64.1 ts-morph esbuild` — 1.64.1 matches the cached chromium-1248 and the repo pin)
4. `node design-system/scripts/capture-ds-previews.mjs [--components A,B]` → dark + light sheets per card in
   `ds-bundle/_screenshots/review/` and `.capture-report.json`; it pierces shadow roots and checks every
   `?story=` renders solo. Grade from the sheets; verdicts in `.design-sync/.cache/review/<Name>.grade.json`.
- `package-capture.mjs` / `package-build.mjs` / `resync.mjs` are NOT used: they need the converter's
  `.stories-map.json` + `_preview/*.js` (React). No `_ds_sync.json` is emitted (validator warns; accepted
  for off-script layouts) → every re-sync re-verifies all components and uploads atomically.
- Header `components[].name` must be a key on `window.ELV` ([BUNDLE_EXPORT]); `index.ts` exports each element
  class under its component name (`ELV.Pane`), meta.json no longer carries an `export` field.
- Card mount roots must be `#r<i>` inside `section.ds-cell` (the validator's render check looks for them).
  `cardMode: "column"` in a component's meta.json gives one full-width story per row.

## Known render warns

- `[RENDER_THIN] … mounts have no text and paint nothing` on every card: the validator reads light-DOM
  `textContent`/computed paint and cannot see shadow roots. Benign — capture-ds-previews.mjs measures
  inside shadow roots and the sheets are read. Not a reason to author `.design-sync/previews/*.tsx`.
- `_ds_sync.json absent` warn: expected (see Pipeline).

## Open

- Unverified: how well the claude.ai/design agent builds with `<elv-*>` tags vs `window.<Global>.<Name>`
  components, and what the self-check does with `components[].sourcePath` ending in `.js` (not `.jsx`).

## Target (user-confirmed 2026-10-22)

- Sync target re-pinned to new DS project "Warm Terminal DS" (`5d5d9df3-22a1-4108-9b0c-08de36edeac1`).
  The old "Event Loop Visualizer DS" (`b8de0915…`) holds only the 2-element spike and is left as-is.
- "Warm Terminal Design System" (`aa1d26f1…`) is a regular canvas project (not DS type) — it is the visual
  reference for grading previews, never an upload target.
- Scope (user-confirmed 2026-10-22): 16 elements — Pane, Queue, Button, Kbd, Tag, Switch, Tabs, Admonition,
  Console, Caption, TraceEvents, HaltBanner, TimerCard, Scrubber, Source, Transport. Every element gets an
  authored preview (`design-system/docs/<Name>/<Name>.preview.html`) graded on the absolute rubric.

## Element behaviour (folded from authoring waves, 2026-10-22)

- Events are Vue CE CustomEvents, payload in `event.detail[0]`: Tabs/Switch `change` (id / boolean),
  Transport `control` (task-back|tick-back|step-back|play|pause|step-forward|tick-forward|task-forward),
  Scrubber `change` (step), TraceEvents `select` (n). Tabs, Switch, Scrubber keep local state synced from
  their prop, so they work in plain HTML without a host writing back.
- Transport `disabled` is a list of control ids, not a boolean. Touch layout = 5 targets, no TASK jumps.
- Transport re-implements elv-button styles inside its shadow root (~40 lines). Candidate refactor: a shared
  CSS-string module imported by button/switch/tabs/transport (shadow roots don't share styles).
- Caption phases: `done` appends ✓, `next` prepends `NEXT:` — pass bare labels. Source takes text from
  `code` only; diagnostics columns are 0-based, `to` exclusive. Tokenizer lives in `source-tokenizer.ts`.
- Emit accepts extra attributes on an authored `<section data-story>`; they move to the `#r<i>` mount root.
- Grading fixes applied: TraceEvents tag column 88px (CHECKPOINT fits); TimerCard meta labels nowrap;
  previews keep orange only for "now"/Halt (TIMING-SENSITIVE is a neutral filled Tag).

## Re-sync risks

- No `_ds_sync.json` anchor is uploaded, so a re-sync cannot tell changed from unchanged: rebuild, re-validate,
  re-capture and re-grade all 16 cards, then upload atomically (full writes; diff `list_files` against the
  build for deletes). The pinned project means re-syncs take the atomic path.
- Previews are hand-authored HTML under `design-system/docs/<Name>/`. They are not type-checked against the
  `.d.ts`; a renamed prop silently breaks a story. Check `.capture-report.json` `bad` after any element change.
- `.d.ts` files are hand-written, not extracted: they can drift from the `.ce.vue` props. Diff them when editing.
- `tokens/tokens.css` is a copy of `docs/design/tokens.css` made at emit time; fonts load at runtime from
  Google Fonts (network-dependent, `[FONT_REMOTE]`).
- `.ds-sync/` playwright pin (1.64.1) is tied to the cached chromium-1248; a playwright bump needs a re-check.
- Scrubber track is a low-contrast 4px raised line by spec; previews read as intended but it is the subtlest card.
- Conventions header (`.design-sync/conventions.md`) names tokens/tags/events: re-validate it against the build
  whenever an element or token is renamed.
