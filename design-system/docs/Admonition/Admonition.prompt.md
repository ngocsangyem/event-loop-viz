Raised callout with a hue left rule and glyph label: NOTE ※, HALT ▲, error ⚠, SyntaxError ↯, success ✓, YOUR TURN ❯.

```html
<elv-admonition tone="note" label="Why 'timeout' still waits">
  A Task only runs when the Call Stack is empty and the microtask checkpoint has drained every Job.
</elv-admonition>
<elv-admonition tone="error" label="Unsupported API · Run blocked">
  <code>fetch</code> on line 2 has no model in this simulator.
  <elv-button slot="actions" hotkey="?">Supported APIs</elv-button>
</elv-admonition>
```

- Tone picks glyph + hue; `label` replaces only the words after the glyph. Labels are mono uppercase automatically.
- `error` and `syntax` are `role="alert"`; the rest are notes. Unsupported API and SyntaxError use red, never yellow (yellow is the Call Stack).
- Put follow-up controls in `slot="actions"` (usually `<elv-button>` words).
- Use inside the Why rail, Ask AI answers (`success` for the interview one-liner, `turn` for the tour coach prompt) and the edit-mode alerts.
