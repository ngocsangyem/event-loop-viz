# Event Loop Visualizer — warm terminal elements

These are **native custom elements** (`<elv-*>` tags), not React components. Loading `_ds_bundle.js`
registers every tag; write them as plain markup (in JSX too: `<elv-pane title="Call Stack" concept="stack">`).
`window.ELV.<Name>` holds each element class, but you never instantiate it — just use the tag.

## Setup

- Load `styles.css` (tokens + Inter / JetBrains Mono from Google Fonts) and `_ds_bundle.js`. No provider.
- Theme lives on `<html data-theme="dark">` (default) or `data-theme="light"`; set the page tone on `html`
  (`background: var(--color-bg)`), never on `body`. Any subtree can switch with its own `data-theme`.
- Scalar props are attributes (`count="2"`, `disabled`). **Arrays are DOM properties** (`el.items = rows`,
  JSX `items={rows}`) or a JSON string attribute in plain HTML (`items='[{"id":"j1","label":"Job #1"}]'`).
- Slots are native: default slot for content, `slot="actions"` on `<elv-pane>`, `<elv-admonition>`,
  `<elv-halt-banner>`. Events are CustomEvents with the payload in `event.detail[0]`
  (`change` on tabs/switch/scrubber, `control` on transport, `select` on trace-events).

## Styling idiom: tokens, no classes

The elements style themselves. For your own layout glue use `var(--*)` tokens from `tokens/tokens.css`:
- Surfaces: `--color-bg` → `--color-bg-raised` → `--color-bg-panel`; lines `--color-line`, `--color-line-soft`;
  row hover `--color-hover-row`.
- Text: `--color-ink`, `--color-ink-2` (body), `--color-ink-3` (meta). Accent `--brand` / `--brand-text` = **now** only.
- Concepts (each with `-soft` fill and `-border`): `--stack` yellow, `--job` magenta, `--task` blue,
  `--webapi` cyan, `--console` green, `--error` red. Element `concept` attrs take `stack|job|task|webapi|console|error|loop`.
- Type: `--font-mono` for every label, hotkey, id, number and code (uppercase only in mono); `--font-sans` for
  sentences. Sizes `--text-caption` `--text-heading` `--text-body` `--text-label` `--text-meta` `--text-item`.
- Motion `--motion-fast|base|slow`, `--ease-out|swift`. Layout `--header-h` 48px, `--dock-h` 92px,
  `--col-source` 320px, `--col-rail` 380px.
- Rules: radius 0, no shadows, ruled panes on a 1px line grid (not cards), no pills, no icon-only controls.

## Elements

Panes: `elv-pane` (wrap every region), `elv-queue`, `elv-console`, `elv-timer-card`. Editor: `elv-source`.
Replay: `elv-caption`, `elv-trace-events`, `elv-scrubber`. Controls: `elv-button`, `elv-transport`,
`elv-switch`, `elv-kbd`. Navigation: `elv-tabs`. Feedback: `elv-admonition`, `elv-halt-banner`, `elv-tag`.
Read each `components/<Group>/<Name>/<Name>.prompt.md` and `.d.ts` before using it.

## Example — replay panes

```html
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--color-line)">
  <elv-pane title="Call Stack" concept="stack" count="1" state="running">
    <elv-queue concept="stack" items='[{"id":"f1","label":"Frame","kind":"Promise reaction","code":"() => console.log(&#39;then 2&#39;)","line":4,"state":"top"}]'></elv-queue>
  </elv-pane>
  <elv-pane title="Microtask Queue" concept="job" count="0">
    <elv-queue concept="job" empty="No microtasks queued"></elv-queue>
  </elv-pane>
</div>
```

Domain words, never renamed: Script, Run, Trace, Trace Event, Task, Job, Checkpoint, Tick, Halt, Budget,
Virtual Clock, Unsupported API (never "macrotask" or "flush"). One focal point per step: only the pane that
changed gets `state="changed"`, only the new row gets `state:"new"`.
