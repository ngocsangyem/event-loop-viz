Mono uppercase tag or count, text-only by default, with optional concept hue and a filled (soft fill + hue border) tone.

`<elv-tag>` is a native custom element. The label goes in the default slot; `concept` and `tone` are
plain string attributes. It has no events.

```html
<elv-tag concept="task">Changed</elv-tag>
<elv-tag concept="loop" tone="filled">Halted · Budget</elv-tag>
<elv-tag tone="filled">Chrome 155 model</elv-tag>
```

- Use `concept="loop"` (orange) only for "now" states such as HALT or the current phase; it is not a queue colour.
- Pick the concept of the thing being tagged: `task` for Task Queue items, `job` for Job Queue, `error` for failures.
- Default text tone for inline counts and labels; `tone="filled"` for status chips in headers and banners.
- Keep labels to one or two words; the element uppercases them, so write them in normal case.
