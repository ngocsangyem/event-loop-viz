Setting toggle rendered as a mono label word plus an ON/OFF state word, with an optional printed hotkey.

`<elv-switch>` is a native custom element with `role="switch"`. The label is the default slot; `checked`
and `disabled` are boolean attributes. It fires `change` on toggle with the new boolean in
`event.detail[0]`; set `checked` from the host to drive it.

```html
<elv-switch checked>Auto-play</elv-switch>
<elv-switch hotkey="K" checked>Keys</elv-switch>
<elv-switch>Show all</elv-switch>
```

- State is shown by the word ON (ink) or OFF (ink-3), never by a sliding knob or colour alone.
- Use for persistent settings: AUTO-PLAY, SHOW ALL, KEYS. Use `elv-button variant="outline" pressed` for a one-off toggle like ASK AI.
- Keep the label to one short mono word; it is uppercased by the element.
- Print `hotkey` only on desktop; omit on phones.
