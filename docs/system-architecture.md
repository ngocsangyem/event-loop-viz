# System architecture

The Trace is the only contract between execution and presentation. A Run
produces one immutable Trace in a Web Worker; the main thread replays it.

```
renderer -> player -> trace <- host <- engine adapter        runner ties them together
```

## Modules (`src/`)

| Module | Responsibility | May import | Runs in |
|---|---|---|---|
| `trace/` | Trace Event and header types (schema v3: a `CallbackInfo` on Tasks and Jobs, stored as a range into the header `source`; task sources for posted messages, networking, the JavaScript engine and animation frames; `webapi:start` / `webapi:cancel` for Web API operations; `render:frame`; header `sourceType`), runtime schema, default Budgets, Observable Output derivation. Pure TS, relative imports only. | nothing | anywhere |
| `engine/` | engine262 adapter implementing the host-owned `EngineAdapter` interface: realm, host globals, Unsupported API stubs, promise-job descriptors and callback descriptors per Task or Job kind (the engine262 patch in `patches/` also carries the reaction handler, the await context and the thenable `then`). The web platform a Script sees: Web IDL helpers, `DOMException`, events and `EventTarget` (DOM dispatch with capture and bubbling; host-fired events call each listener as its own job so a Checkpoint runs between them), the window (its prototype chain, `postMessage`, animation frames), structured clone, `MessageChannel` / `MessagePort` with transfer, the `document` node tree, `fetch` (`data:` URLs and `// @fetch` mocks), modules (detection, `data:` imports, `import()`), `gc()` with a mark-and-clear over the realm and host roots, `FinalizationRegistry` cleanup Tasks, WeakRef targets kept until the Checkpoint, `SharedArrayBuffer` and `Atomics`. The only place that imports `@engine262/**`. | trace, host (the interface and the `// @fetch` parser) | Worker |
| `host/` | HTML event loop for one Host Profile (`chrome-155`): task queues, Virtual Clock, timers (a timer's Task is queued once the Virtual Clock reaches its due time, on every clock advance), one host task queue for every other source (ready Tasks and Tasks delayed by network latency; oldest enqueue wins across sources and timers), rendering opportunities on a 60 Hz grid (`animation-frame-scheduler`), Checkpoints (also between the listeners of a host-fired event), rejection tracker, seeded `Math.random`, Budget meter, timing-sensitivity detection (compute boundaries and frame races). Emits Trace Events; talks to the engine only through `EngineAdapter`. | trace | Worker |
| `runner/` | `runScript` and its Worker entry, the main-thread `worker-run-client` (wall-clock watchdog, cancel), and the pre-run Unsupported API scan. | trace, host, engine | both |
| `player/` | Pure replay logic over a Trace: `stateAt` folds events into a `ReplayState`, snapshots, Visible Event indexing, navigation (event, Tick, Task, start/end, seek), per-event explanations. No Vue, no timers. | trace | anywhere |
| `renderer/` | Vue app shell built with shadcn-vue (Tailwind v4, reka-ui; generated components in `src/components/ui/`): header with the Panels/Diagram/3D view switch and language, editor card (CodeMirror 6), transport bar, scrubber, event list and detail, banners, run settings, colour theme. Styling: `src/style.css` imports the warm terminal tokens from `docs/design/tokens.css` (see `DESIGN.md`) and maps them to Tailwind/shadcn-vue names; `renderer/theme.css` maps the same roles onto the Scene and editor tokens; `renderer/panels/panel-skin.css` gives each pane its concept hue. Holds the playhead and playback clock; asks the player for state. | player, trace | main thread |
| `renderer/panels/` | Default visualization: one labelled card per part of the event loop (Call Stack, Task Queue, Microtask Queue, Web APIs, Event Loop phase), each a pure function of `ReplayState`. Reuses the Scene's model functions. Entries animate in, out and between places; the call stack hides built-ins called by other built-ins. A Run auto-plays (Autostart toggle), and playback passes over steps whose panels look unchanged (`panelSignature`). Callback chips show the code a Task or Job will call; the Web APIs panel draws one card per pending timer and per Web API operation (fetch, body read, `import()`, rAF callback, `waitAsync`). On a single step, forward or back, a ghost copy of a chip flies between panels in a fixed overlay (`chip-travel-layer`), cleaned up synchronously when superseded; jumps and reduced motion just place the chips. | player types, scene models | main thread |
| `renderer/scene/` | Isometric SVG Scene, shown when the user picks the 3D view (call stack, console, microtask and task queues, timer shelf). A pure function of `ReplayState`; no Trace or store access. | own files, `vue`, player types | main thread |
| `renderer/diagram/` | Architecture-style Diagram view: cards for Call Stack, Web APIs, queues, Event Loop and Console joined by orthogonal connectors. Card contents are a pure function of `ReplayState`; the current Trace Event picks which connectors a signal travels, which card border is drawn in, and whether an error marks a refusal. Reduced motion shows the same meaning as a still image. | player, trace, panels and scene models | main thread |
| `renderer/ai/` | Ask AI chat: the ASK AI word in the dock opens a non-modal panel that takes the right column in place of the Why rail on wide screens and is a bottom sheet above the dock on narrow ones; settings live in a modal dialog. The learner's own OpenRouter key and model; the browser calls OpenRouter directly, so the key never reaches a server of ours, and it stays in memory unless the learner opts in to localStorage. Each question carries the Script, every visible event of the Run with its built-in explanation, the Run's output and the playhead. The system prompt casts the AI as an engineer who coaches for interviews (the rule first, each term explained once, common misconceptions named, a closing line to say in an interview) and asks for a tour whose stops name Trace events; event numbers stay out of the visible text; Next and Previous pause playback and move the playhead to each stop, and the tour controls become a segment of the dock when the panel is minimized. Answers come in the UI language. | player, trace | main thread |
| `i18n/` | vue-i18n instance and messages (`en`, `vi`), one file per feature; English is the schema. The language is remembered per browser and set on `<html lang>`. The player stays framework-free: event explanations come from a per-language phrasebook in `player/`. | none | main thread |
| `share/` | Share-link codec: Script and settings in the URL fragment. | none | main thread |
| `examples/` | Built-in example Scripts backed by oracle fixtures. | none | main thread |

`src/stores/`, `src/main.ts` and `src/App.vue` are app glue outside the module graph.

App layout (DESIGN.md · Layout): a header, then a ruled grid (`1px` gaps on the line colour) and a
pinned dock. Edit mode is `600px | stage`; replay is `320px | stage | 380px` (read-only Source,
stage, Why rail), and Ask AI takes the right column at `400px`. On wide screens (`xl`) the shell
fills the viewport and each column scrolls on its own. The stage (`replay-stage.vue`) starts with
the step caption (meta row, one sentence, phase strip), then the chosen view. `step-focus-model.ts`
compares the step with the one before it: changed panes get their concept's soft tint, a 2px top
rule and a CHANGED label, and entries that just arrived get a NEW tag. On a phone, SCRIPT / REPLAY
tabs show one mode at a time, the Script shrinks to a Source peek in REPLAY, and panes the step left
alone fold to their 44px header row.

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
  `Math.random` is seeded and the seed is recorded in the Trace header. Network latency comes from
  `// @fetch` lines, frames from a fixed 60 Hz grid, garbage collection only from `gc()`.
- Budgets (nodes, tasks, virtual ms, events) halt a Run deterministically.
- `oracle/` holds fixtures and Chrome-recorded goldens; `oracle.test.ts` compares simulator output
  to them, and a version guard fails if a golden's Chrome major differs from the Host Profile
  `tests/golden/` holds golden Traces and the frozen Trace schema v3 snapshot (`tests/golden/trace-schema-v3.json`).
- The recorder (`oracle/record-golden-in-chrome.mjs`) understands `@oracle-module`, `@oracle-isolated`
  and `// @fetch` directives; the Chrome facts behind the host APIs are in
  `docs/research/host-api-semantics.md`.

## Build

Vite 8, Vue 3, Pinia. The engine ships only in the Worker chunk; `keepNames` preserves built-in
frame labels; `pnpm run check:build` gates both. See `docs/deployment-guide.md`.
