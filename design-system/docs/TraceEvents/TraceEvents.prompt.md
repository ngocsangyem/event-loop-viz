Trace Events list for the Why rail: rows `n · TAG · text` grouped under `TICK n · TASK #n — SOURCE` headers, with the active row marked and future rows dimmed.

`<elv-trace-events>` is a native custom element. `groups` is an array of `{label, events}`: set it as a DOM property or as a JSON string attribute in plain HTML. `active` is the event number of the current step. Rows are buttons; a click dispatches a `select` CustomEvent whose `event.detail[0]` is the event number. Slot `header` goes above the list.

```html
<elv-trace-events active="3"
  groups='[{"label":"TICK 1 · TASK #1 — SCRIPT","events":[
    {"n":1,"tag":"PUSH","concept":"stack","text":"Script frame pushed"},
    {"n":2,"tag":"LOG","concept":"console","text":"script start"},
    {"n":3,"tag":"TIMER","concept":"webapi","text":"setTimeout registered, 0 ms (L2)"}]}]'></elv-trace-events>
```

- Put it below the Why explainer in the Replay right column; the whole Trace is listed, not just past events.
- Give each event the concept hue of what it touched (PUSH stack, JOB job, LOG console, TIMER webapi).
- Keep `active` in sync with the scrubber step; listen for `select` to seek the Replay.
- Tags are short uppercase words; the description is a plain Inter sentence.
