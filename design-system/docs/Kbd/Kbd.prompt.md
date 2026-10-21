Printed hotkey in bracket style with no box (`[⇧←]`), for keyboard maps, hints and labels outside a button.

```html
<p>Press <elv-kbd>⌘↵</elv-kbd> to record a Trace.</p>
```

- `<elv-button hotkey="…">` already prints its own key; use `<elv-kbd>` only in prose, keyboard maps and headers (`[L]EN/VI`).
- Keys: `␣`/Space, `←` `→`, `⇧←` `⇧→`, `⌥←` `⌥→`, `Home` `End`, `⌘↵`, `Esc`, `1` `2` `3`, `L` `T` `S`, `?`.
- Never print hotkeys on touch layouts.
