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

## Open

- DesignSync needs `/design-login` from an interactive Claude Code session before any upload.
- Unverified: whether the claude.ai/design agent builds well with `<elv-*>` tags instead of
  `window.<Global>.<Name>` components, and what the self-check does with a header whose
  `components[].sourcePath` is not a `.jsx`. Test with the 2-element spike before building the full set.
