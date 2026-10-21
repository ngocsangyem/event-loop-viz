A Web APIs timer entry in the webapi (cyan) hue: mono id, setTimeout/setInterval, L<line>, delay, Virtual Clock progress bar and the callback code.

`<elv-timer-card>` is a native custom element configured entirely by scalar attributes (`delay="0"`,
`state="new"`); numbers are parsed from attributes, or set as DOM properties from script. It emits no events.

```html
<elv-pane title="Web APIs" concept="webapi" count="1">
  <elv-timer-card label="TIMER #1" api="setTimeout" delay="0" elapsed="0" due="4" line="2" state="new"
    code="() => console.log('timeout')"></elv-timer-card>
</elv-pane>
```

- Place cards inside `<elv-pane concept="webapi">`; one card per live timer.
- Lifecycle: `new` when it appears, `pending` while elapsed < delay, `fired` (with `task="TASK #2"`) once it left for the Task Queue, leaving a dashed ghost.
- Use `state="interval"` with `api="setInterval"` and `fires` for repeating timers.
- `elapsed` and `due` are Virtual Clock ms, never wall time.
