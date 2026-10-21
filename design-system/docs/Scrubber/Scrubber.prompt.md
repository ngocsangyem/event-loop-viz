Replay scrubber: mono `STEP n / total`, a 4px track with Task and Checkpoint lanes, console and error ticks, an accent playhead, and the Virtual Clock; a keyboard and pointer slider.

`<elv-scrubber>` is a native custom element. `total`, `value` (1-based step) and `clock` are plain attributes; `segments` and `marks` are arrays, set as DOM properties or as JSON string attributes in plain HTML. It dispatches a `change` CustomEvent with the new step in `event.detail[0]`; the element moves its own playhead, so also write the step back to `value` to keep other controls in sync.

```html
<elv-scrubber total="31" value="15" clock="0 ms"
  segments='[{"from":1,"to":7,"kind":"task"},{"from":8,"to":16,"kind":"checkpoint"},{"from":17,"to":31,"kind":"task"}]'
  marks='[{"at":2,"kind":"console"},{"at":10,"kind":"console"},{"at":15,"kind":"console"}]'></elv-scrubber>
```

- Lives in row 1 of the control dock, full width; it needs no wrapper.
- Segments and marks use 1-based step numbers matching `value`.
- Keys: ← / → move one step, Home / End jump to the first or last step; click or drag the track to seek.
- Use `error` marks for steps that print errors; never recolour the playhead, it is always the accent.
