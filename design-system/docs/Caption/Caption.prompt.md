Step caption for Replay: a mono meta row (step, Tick, line, Virtual Clock), one Inter sentence naming the change, and a phase strip with the current phase tinted.

`<elv-caption>` is a native custom element. Scalars are plain attributes (`step`, `total`, `tick`, `line`, `clock`, `halted`); `phases` is an array, set as a DOM property or as a JSON string attribute in plain HTML. The sentence is the default slot or the `sentence` attribute. The sentence is `aria-live="polite"`.

```html
<elv-caption step="15" total="31" tick="1" line="3" clock="0 ms"
  phases='[{"label":"TASK #1","state":"done"},
           {"label":"MICROTASK CHECKPOINT · JOB 3/3","concept":"job","state":"current"},
           {"label":"TASK #2","state":"next"}]'>
  Job #3 runs: then 2 prints to the Console.
</elv-caption>
```

- One caption per Replay step, at the top of the stage; it is the first focal point.
- Keep the sentence to one line that names the change; put nothing else in the slot.
- Set `concept` only on the `current` phase; `done` and `next` stay neutral.
- When the Run halts, set `halted`; the current phase is replaced by `HALT · BUDGET` in the accent.
