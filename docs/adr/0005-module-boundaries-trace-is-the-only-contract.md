# Module boundaries: the Trace is the only shared contract

```
src/trace/     schema, versioning, reducer, snapshots. Pure TS, no dependencies.
src/engine/    engine262 adapter: realm, host functions, hooks → Trace Events. Worker-only.
src/host/      HTML event loop, Virtual Clock, timers, Checkpoints, rejection tracking, Host Profiles. Worker-only.
src/runner/    Worker entry plus main-thread client: messaging, watchdog, Budgets.
src/renderer/  Vue and anatomy SVG. Depends on trace/ only.
```

`host` depends on an `EngineAdapter` interface, never on engine262 types, so QuickJS-wasm could replace engine262 (ADR-0001). The renderer never imports engine or host code. An ESLint import-boundary rule enforces both.
