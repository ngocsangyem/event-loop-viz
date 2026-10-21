Control-dock transport row: TASK/TICK/STEP words with printed keys around a single primary PLAY/PAUSE, plus a five-target touch layout.

`<elv-transport>` is a native custom element with `role="toolbar"`. `playing`, `at-start` and `at-end` are
boolean attributes; `disabled` is a JSON string attribute of control ids (or an array property). It fires
`control` with one of `task-back`, `tick-back`, `step-back`, `play`, `pause`, `step-forward`,
`tick-forward`, `task-forward` in `event.detail[0]`. Keyboard shortcuts are the app's job.

```html
<elv-transport></elv-transport>
<elv-transport playing></elv-transport>
<elv-transport at-start disabled='["task-forward"]'></elv-transport>
<elv-transport layout="touch"></elv-transport>
```

- PLAY is the only filled control; do not add a second primary in the dock.
- Set `at-start` / `at-end` from the playhead so back/forward are disabled at the Trace edges.
- Use `layout="touch"` on phones (52px targets, hotkeys hidden, TASK jumps dropped).
- Place it in row 2 of the dock; give it the full row width.
