Read-only Source pane body: line-number gutter, concept-coloured Script (setTimeout cyan, Promise/then/queueMicrotask magenta, console green), current-line rule, queued-work squares and unsupported/syntax diagnostics.

`<elv-source>` is a native custom element with no header and no events. `code` is a plain string attribute
(newlines allowed) and is the only source of text, slot content is ignored. `queued` and `diagnostics` are
arrays: set them as DOM properties, or as JSON string attributes in plain HTML (use `&#39;` for single quotes inside).

```html
<elv-pane title="Source · Read-only">
  <elv-source current="3"
    code="console.log('script start')
setTimeout(() => console.log('timeout'), 0)
Promise.resolve().then(() => console.log('then 1'))"
    queued='[{"line":2,"concept":"webapi"},{"line":3,"concept":"job"}]'></elv-source>
</elv-pane>
```

- Always wrap it in `<elv-pane title="Source · Read-only">`; it is the Replay-mode left column, never an editor.
- Square concept follows the work: `webapi` while a timer waits, `task` once it fired, `job` for Promise reactions.
- Diagnostic columns are 0-based, `to` exclusive; `kind="unsupported"` for APIs like `fetch`, `kind="syntax"` for parse errors.
- Use the sample Script for mockups; line numbers in `current`, `queued` and `diagnostics` are absolute (offset by `start-line`).
