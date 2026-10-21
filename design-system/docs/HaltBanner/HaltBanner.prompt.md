Halt banner: a 44px raised strip with an accent rule, `▲ HALT · TASK BUDGET`, one sentence, an optional TIMING-SENSITIVE tag and an actions slot.

`<elv-halt-banner>` is a native custom element. `reason` sets the label words; `timing-sensitive` is a boolean attribute (DOM property `timingSensitive`). The sentence is the default slot. The `actions` slot is empty unless you fill it. It has `role="status"`.

```html
<elv-halt-banner reason="TASK BUDGET" timing-sensitive>
  Task #1 used all 1000 Budget steps, so the Run stopped at Tick 1.
  <elv-button slot="actions" variant="outline">Raise budget</elv-button>
</elv-halt-banner>
```

- Render it only when the Run halted; it sits above the stage, not inside a pane.
- One sentence, no more; say which Budget ran out and where the Run stopped.
- Use `reason="MICROTASK BUDGET"` for a Job loop that never drained.
- Set `timing-sensitive` only when the stop makes timer results unreliable.
