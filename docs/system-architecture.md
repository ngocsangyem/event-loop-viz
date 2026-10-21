# System architecture

The Trace is the only contract between execution and presentation. A Run
produces one immutable Trace in a Web Worker; the main thread replays it.

```
renderer -> player -> trace <- host <- engine adapter        runner ties them together
```

## Modules (`src/`)

| Module | Responsibility | May import | Runs in |
|---|---|---|---|
| `trace/` | Trace Event and header types, runtime schema, default Budgets, Observable Output derivation. Pure TS, relative imports only. | nothing | anywhere |
| `engine/` | engine262 adapter implementing the host-owned `EngineAdapter` interface: realm, host globals, `MessageChannel` global, Unsupported API stubs, promise-job descriptors (engine262 patch in `patches/`). The only place that imports `@engine262/**`. | trace, host (the interface) | Worker |
| `host/` | HTML event loop for one Host Profile (`chrome-155`): task queues, Virtual Clock, timers, Checkpoints, rejection tracker, port-message task source, seeded `Math.random`, Budget meter, timing-sensitivity detection. Emits Trace Events; talks to the engine only through `EngineAdapter`. | trace | Worker |
| `runner/` | `runScript` and its Worker entry, the main-thread `worker-run-client` (wall-clock watchdog, cancel), and the pre-run Unsupported API scan. | trace, host, engine | both |
| `player/` | Pure replay logic over a Trace: `stateAt` folds events into a `ReplayState`, snapshots, Visible Event indexing, navigation (event, Tick, Task, start/end, seek), per-event explanations. No Vue, no timers. | trace | anywhere |
| `renderer/` | Vue app shell built with shadcn-vue (Tailwind v4, reka-ui; generated components in `src/components/ui/`): header with the Panels/Diagram/3D view switch, language and Ask AI, editor card (CodeMirror 6), transport bar, scrubber, event list and detail, banners, run settings, colour theme. Holds the playhead and playback clock; asks the player for state. | player, trace | main thread |
| `renderer/panels/` | Default visualization: one labelled card per part of the event loop (Call Stack, Task Queue, Microtask Queue, Web APIs, Event Loop phase), each a pure function of `ReplayState`. Reuses the Scene's model functions. Entries animate in, out and between places; the call stack hides built-ins called by other built-ins. A Run auto-plays (Autostart toggle), and playback passes over steps whose panels look unchanged (`panelSignature`). | player types, scene models | main thread |
| `renderer/scene/` | Isometric SVG Scene, shown when the user picks the 3D view (call stack, console, microtask and task queues, timer shelf). A pure function of `ReplayState`; no Trace or store access. | own files, `vue`, player types | main thread |
| `renderer/diagram/` | Architecture-style Diagram view: cards for Call Stack, Web APIs, queues, Event Loop and Console joined by orthogonal connectors. Card contents are a pure function of `ReplayState`; the current Trace Event picks which connectors a signal travels, which card border is drawn in, and whether an error marks a refusal. Reduced motion shows the same meaning as a still image. | player, trace, panels and scene models | main thread |
| `renderer/ai/` | Ask AI side sheet. The learner's own OpenRouter key and model; the browser calls OpenRouter directly, so the key never reaches a server of ours. The key is kept in memory unless the learner opts in to remembering it in localStorage. Each question carries the Script, the current event with its built-in explanation and a summary of the replay state; the system prompt answers in the UI language. | player, trace | main thread |
| `i18n/` | vue-i18n instance and messages (`en`, `vi`), one file per feature; English is the schema. The language is remembered per browser and set on `<html lang>`. The player stays framework-free: event explanations come from a per-language phrasebook in `player/`. | none | main thread |
| `share/` | Share-link codec: Script and settings in the URL fragment. | none | main thread |
| `examples/` | Built-in example Scripts backed by oracle fixtures. | none | main thread |

`src/stores/`, `src/main.ts` and `src/App.vue` are app glue outside the module graph.

## Execution flow

1. The renderer calls `worker-run-client`, which starts a Worker (created on first Run) and arms the
   30 s wall-clock watchdog.
2. The pre-run scan (`runner/unsupported-api-scan.ts`) lists referenced Unsupported APIs.
3. In the Worker, `run-script-worker` calls `runScript`: the host drives the engine262 adapter,
   advancing the Virtual Clock per evaluated node and emitting Trace Events until the loop is empty
   or a Budget is exhausted (a Halt; the partial Trace stays valid).
4. The result is a union: `ran` (Trace plus Observable Output), `syntax-error`, or
   `watchdog-killed`. Observable Output is derived from the Trace by one pure function, so the UI
   console and the oracle comparison cannot disagree.
5. The renderer builds a `Player` over the Trace and renders `stateAt(position)`. Any position gives
   the same Scene whether reached by play, step or scrub.

## Import-boundary lint

`eslint-import-boundaries.ts` (wired into `eslint.config.ts`) enforces the graph with
`no-restricted-imports`, matching literal specifiers so it needs no resolver:

- `trace` imports no other module and no third-party code (outside tests).
- `engine` may not import runner, player, renderer. `host` may not import engine, runner, player,
  renderer. `runner` may not import player or renderer. `player` may not import engine, host,
  runner or renderer, and no Vue or Pinia (outside tests). `renderer` may not import engine, host,
  runner.
- `@engine262/**` may be imported only under `src/engine/`.
- `renderer/scene/` may import only its own files, `vue` and player *types*.
- `src/__tests__/import-boundaries.test.ts` exercises the rules.

## Determinism and correctness

- No wall-clock time in a Run: the Virtual Clock advances 1 us per evaluated node (configurable);
  `Math.random` is seeded and the seed is recorded in the Trace header.
- Budgets (nodes, tasks, virtual ms, events) halt a Run deterministically.
- `oracle/` holds fixtures and Chrome-recorded goldens; `oracle.test.ts` compares simulator output
  to them, and a version guard fails if a golden's Chrome major differs from the Host Profile
  `tests/golden/` holds golden Traces and the frozen Trace schema v1 snapshot.

## Build

Vite 8, Vue 3, Pinia. The engine ships only in the Worker chunk; `keepNames` preserves built-in
frame labels; `pnpm run check:build` gates both. See `docs/deployment-guide.md`.
