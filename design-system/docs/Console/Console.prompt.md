Console output lane: mono rows tagged LOG / INF / WRN / ERR / REJ with source line, repeat count and uncaught/unhandled flags.

`<elv-console>` is a native custom element. `lines` is an array: set it as a property (in JSX
`lines={rows}`, in script `el.lines = rows`) or as a JSON string attribute in plain HTML.

```html
<elv-pane title="Console" concept="console" count="3">
  <elv-console lines='[{"level":"log","text":"script start","line":1},
                       {"level":"log","text":"then 1","line":3},
                       {"level":"error","text":"TypeError: x is not a function","line":7,"uncaught":true}]'></elv-console>
</elv-pane>
```

- Wrap it in `<elv-pane concept="console">`; the console sits below the four queue panes.
- Lines are in print order; never re-sort. Collapse identical repeats with `repeat` instead of listing them.
- Use the sample Script's output for mockups: script start, script end, then 1, microtask, then 2, timeout.
