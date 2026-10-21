Ruled pane for one event-loop region (Call Stack, Microtask Queue, Task Queue, Web APIs, Console) with a concept-hue header.

`<elv-pane>` is a native custom element (Vue `defineCustomElement`). Write it as a plain tag; it is
registered when `_ds_bundle.js` loads. Pass `title`, `concept`, `count` and `state` as attributes.

```html
<elv-pane title="Microtask Queue" concept="job" count="2" state="changed">
  <elv-queue concept="job" empty="No microtasks queued"></elv-queue>
</elv-pane>
```

- One focal point per step: give `state="changed"` only to the pane whose contents changed this step.
  A running Call Stack uses `state="running"`. Every other pane stays `idle`.
- Concepts: `stack` (yellow, Call Stack), `job` (magenta, Microtask Queue), `task` (blue, Task Queue),
  `webapi` (cyan, Web APIs/timers), `console` (green), `error` (red). `loop` is the orange accent
  (Event Loop); orange always means "now".
- Lay panes out as a ruled grid in run order: Call Stack → Microtask Queue → Task Queue → Web APIs,
  console below. No cards, no rounded corners, no shadows.
- Header-end controls go in `<button slot="actions">…</button>`.
