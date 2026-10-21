# UX References (Mobbin)

Patterns from shipped products that apply to the replay UI. Collected 2026-10-21.

| Pattern | Reference | Apply to |
|---|---|---|
| Read-only editor with a banner while a run is active ("Read-only mode. Stop the script to make edits.") | [Browserbase playground](https://mobbin.com/screens/8fd030b5-9c49-43b4-8c2e-f422271a476e) | Editor during replay; editing discards the Trace |
| Scrubber with color-coded event markers; a list panel synced to the playhead, filtered by type | [Sentry replay](https://mobbin.com/screens/ca607642-175e-46bd-96a6-3432d46295f8) | Timeline: one marker color per event family (task, job, timer, error) |
| Scrubber with markers, speed (2x), and a "skip inactivity" toggle | [Hotjar recording](https://mobbin.com/screens/e8e5a459-b915-49c4-ac1c-8e852b358f95) | Speed control; "skip bookkeeping" = Visible Events only |
| Step list beside playback, current step highlighted, timestamp per step, 1x speed | [Devin test replay](https://mobbin.com/screens/2c590764-5b6a-48cc-b979-310c18a1bdd8) | Trace Event list synced to the scene |
| Player plus tabs (Console / Network / Events) with filter chips (All / Page / Runtime / Input) | [Browserbase session](https://mobbin.com/screens/66bd695c-cbfe-4d53-80f0-81dceb4905c4) | Bottom panel tabs: Console, Events; filter chips per event family |
| Event list on the left, detail pane on the right (metadata plus raw JSON) | [Stripe events](https://mobbin.com/screens/5423e185-8374-4b6c-a4a0-2d3ae9adc1d0), [WorkOS events](https://mobbin.com/screens/a5b50327-60e0-4075-9cfd-7f383d18265c) | Selected Trace Event detail: spec ref, payload, source location |
| Graph canvas plus a turn-by-turn trace panel | [LangSmith studio](https://mobbin.com/screens/ed018d3a-df6a-4ae4-bd1a-905b80fc93d0) | Scene beside an event panel |

Anti-pattern seen: dense audit-log tables ([1Password](https://mobbin.com/screens/4df9de3d-fe83-46ba-b832-33c3ffbc48df)). They are too heavy for a step-through learning tool, so keep the event list to one line per event.
