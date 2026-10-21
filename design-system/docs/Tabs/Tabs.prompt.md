Mono-word tab navigation with a 2px ink underline on the active item, optional printed hotkeys and run meta, and a 44px touch size.

`<elv-tabs>` is a native custom element with `role="tablist"`. `items` is a JSON string attribute (or an
array when set as a DOM property); `value` is the active item id. It fires `change` with the new id in
`event.detail[0]`.

```html
<elv-tabs label="Mode" value="replay" items='[{"id":"edit","label":"Edit","hotkey":"E"},{"id":"replay","label":"Replay","hotkey":"R","meta":"Run #3"}]'></elv-tabs>
<elv-tabs size="touch" label="Screen" value="script" items='[{"id":"script","label":"Script"},{"id":"replay","label":"Replay"}]'></elv-tabs>
```

- Use for mode nav (EDIT / REPLAY) and view nav (PANELS / DIAGRAM / 3D SCENE); one active item at a time.
- Print the number or letter hotkey from the keyboard map; omit on touch.
- Use `meta` for the current Run, e.g. `Run #3`. Disable REPLAY (`"disabled":true`) until a Trace exists.
- On phones use `size="touch"` for SCRIPT / REPLAY.
