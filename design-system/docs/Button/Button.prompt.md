Mono uppercase word control with a printed hotkey (`[⌘↵]RUN`); primary, secondary, outline-toggle and destructive variants.

`<elv-button>` is a native custom element. The word goes in the default slot; attributes are strings
(`disabled`, `pressed` are boolean attributes). It fires a normal `click`.

```html
<elv-button variant="primary" hotkey="⌘↵">Run</elv-button>
<elv-button hotkey="→">Step</elv-button>
<elv-button variant="outline" hotkey="A" pressed>Ask AI</elv-button>
<elv-button variant="destructive" hotkey="Esc">Cancel</elv-button>
```

- Only one `primary` per row (PLAY in the dock, SAVE in a dialog, RUN in the editor).
- Always a word, never an icon-only control, never a pill. Words are short verbs/nouns: STEP, TICK, TASK, PLAY, RUN, SHARE.
- Print the hotkey from the keyboard map (`␣` play, `←/→` step, `⇧←/⇧→` tick, `⌥←/⌥→` task, `⌘↵` run, `A` ask AI, `Esc` cancel).
- On phones use `size="touch"` (44px; hotkeys are hidden). Give a `label` when the word needs context.
