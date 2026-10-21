Animated lane of queue entries or stack frames: each row shows a mono id, kind, line, tag and the callback code.

`<elv-queue>` is a native custom element. `items` is an array of rows: set it as a property
(in JSX, `items={rows}`; in script, `el.items = rows`) or as a JSON string attribute in plain HTML.
Keep `id` stable across updates: a row whose id survives glides to its new place, a new id reveals
(opacity + 4px rise), a missing id pops (fade + 4px lift). Reduced motion shows only the end state.

```html
<elv-queue concept="job" empty="No microtasks queued"
  items='[{"id":"j1","label":"Job #1","kind":"Promise reaction","code":"() => console.log(\"then 1\")","line":3},
          {"id":"j2","label":"Job #2","kind":"queueMicrotask","code":"() => console.log(\"microtask\")","line":5,"state":"new"}]'>
</elv-queue>
```

- Order: queues list the head first; the Call Stack lists the top frame first and marks it `state:"top"`.
- `state:"new"` only for the row that arrived this step; `running` for the Task or Job being run.
- `ghost` keeps a dashed placeholder where an item just left, so the eye can follow it.
- Put it inside an `<elv-pane>` with the same `concept`.
- Use the domain words: Task, Job, Checkpoint, Tick (never "macrotask" or "flush").
