<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo/logo-symbol-color-dark-bg.svg">
    <img src="docs/assets/logo/logo-symbol-color-light-bg.svg" alt="Event Loop Visualizer logo" width="96" height="96">
  </picture>
</p>

# Event Loop Visualizer

Paste a JavaScript Script, press Run, and replay every step of the Run against a simulated browser
event loop: call stack, microtask queue, task queue, timers, Virtual Clock and console.

The Observable Output of a Run (console lines, uncaught exceptions, unhandled rejections) matches
what Chrome 155 produces for the same Script. Differential tests check this: they run each fixture
in real Chrome and in the simulator and compare the two outputs. The app
targets one Host Profile, `chrome-155`.

The site is not deployed yet. The maintainer deploys by hand with
[docs/deployment-guide.md](docs/deployment-guide.md) and will add the URL here.

## Showreel

[![Event Loop Visualizer showreel: a Job cuts ahead of a Task at the microtask checkpoint](docs/assets/showreel/event-loop-showreel-poster.jpg)](docs/assets/showreel/event-loop-showreel.mp4)

A 15-second motion piece made from the app's sample Script (click the frame to play it, sound
on). It is rendered in code from [`motion/`](motion/): `node score.mjs` synthesizes the score and
measures its beat grid, then `node render.mjs` renders every frame through `window.seek(t)` and
encodes the MP4.

## How it works

The Script runs in [engine262](https://github.com/engine262/engine262) behind a hand-written HTML
event-loop host on a Virtual Clock, inside a Web Worker. A Run produces one immutable Trace. The UI
never drives the engine: it replays the Trace (play/pause, step, jump by Tick or Task, scrubber,
source highlighting). Callback chips (the code a Task or Job will call) move between the panels as the replay steps. Three views show the same state: labelled Panels (default), an animated
Diagram, and the isometric 3D Scene. The UI is in English and Vietnamese. "Ask AI" (the ASK AI button
at the end of the playback dock) lets a learner ask their own OpenRouter model to walk through the
whole Run as a tour: Next and Previous move the replay to each stop. The browser sends the key
straight to OpenRouter and the app stores it nowhere unless the learner asks it to remember the key on that
device. Architecture: [docs/system-architecture.md](docs/system-architecture.md).
Status and plans: [docs/project-roadmap.md](docs/project-roadmap.md). Terms are defined in
[GLOSSARY.md](GLOSSARY.md). The code is the record of design decisions.

## Logo

The mark is a square loop. Its top-right corner has broken off as a block: the Task running now.
The block uses the app's orange accent, which in the UI always means "now". The masters live in
[docs/assets/logo/](docs/assets/logo/): black, white, colour on light and on dark, and a dark tile.
`logo-tile-small.svg` is a 16px-grid cut with wider gaps, used for `public/favicon.svg` and
`public/favicon.ico`.

## Supported APIs

Each API below behaves the way Chrome 155 behaved when we measured it. The measurements are in
[docs/research/host-api-semantics.md](docs/research/host-api-semantics.md).

### Language and timers

| API | How the simulator runs it |
|---|---|
| Promise, async/await, generators, async generators, `for await` | Everything engine262 implements. |
| `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval` | The callback runs as a Task, with `window` as `this` and the extra arguments passed through. |
| `queueMicrotask` | The callback joins the microtask queue. |
| `requestAnimationFrame`, `cancelAnimationFrame` | A rendering opportunity comes every 16.7 ms of virtual time, the first one 4 ms after the Script starts. Each callback shows as an `animation-frame` Task, and a microtask checkpoint follows it. |
| `Date.now()`, `performance.now()` | Both read the Virtual Clock. |
| `Math.random` | Seeded per Run. |
| `console.log`, `console.info`, `console.warn`, `console.error` | Lines go to the Console panel. |

### Messages and events

| API | How the simulator runs it |
|---|---|
| `MessageChannel`, `MessagePort` | Ports are event targets. `postMessage` sends a structured clone and accepts a transfer list. Ports support `onmessage`, `addEventListener('message')` with `start()`, `close()`, and transfer to another port. |
| `window.postMessage(message, targetOrigin, transfer)` | Queues a Task on the posted message source. When it runs, the listeners are called one by one with a microtask checkpoint between them. |
| `window`, `self`, `globalThis` | All three are the same object. |
| `EventTarget`, `Event`, `CustomEvent`, `MessageEvent`, `ErrorEvent`, `PromiseRejectionEvent`, `DOMException` | Constructible as in the browser. |
| `addEventListener`, `removeEventListener`, `dispatchEvent` | `dispatchEvent` runs the listeners right away, on the current stack. |
| `onmessage`, `onerror`, `onunhandledrejection`, `onrejectionhandled` | `error` and `unhandledrejection` events reach the Script's own listeners. |

### DOM

The page is the one the Oracle loads: `<html><head></head><body><script>`.

| API | How the simulator runs it |
|---|---|
| `document.createElement`, `createTextNode`, `getElementById` | As in the browser. |
| `querySelector`, `querySelectorAll` | Tag, `#id`, `.class` and descendant selectors. |
| `append`, `appendChild`, `insertBefore`, `remove` | Build and change the tree. |
| `textContent`, attributes, `classList` | Read and write. |
| `innerHTML` | Read only. |
| `click()`, `onclick` | `click()` dispatches synchronously, with capture and bubbling. |

### Network and modules

| API | How the simulator runs it |
|---|---|
| `fetch`, `Response`, `Headers` | `data:` URLs behave as in Chrome. A Run has no network, so a line such as `// @fetch <url> [status] [latency]ms [body]` in the Script declares the response an http(s) URL gets. Any other URL fails with `TypeError: Failed to fetch`, as it does offline. |
| `import`, `export`, top-level `await`, `import.meta` | A Script that only parses as a module runs as one. |
| `import()` and static `import` | Both load `data:` URLs. |

### Memory and the engine

| API | How the simulator runs it |
|---|---|
| `WeakRef`, `FinalizationRegistry` | Cleanup callbacks run in a Task of their own. |
| `gc()` | Collects garbage, as Chrome does when started with `--js-flags=--expose-gc`. |
| `SharedArrayBuffer` | Available, because the page counts as cross-origin isolated. |
| `Atomics` | `Atomics.wait` throws on the window, as in Chrome. `Atomics.waitAsync` wakes in a Task that `Atomics.notify` queues. |

## Unsupported APIs

The simulator does not model these. It refuses them instead of guessing how they would be ordered.

| API | What happens |
|---|---|
| `Worker`, `SharedWorker`, `XMLHttpRequest`, `WebSocket`, `requestIdleCallback` | Each is a stub that throws `UnsupportedApiError` with the API's name. A scan lists the ones a Script uses before it runs, and the Run does not start. |
| Setting `innerHTML` to markup | Throws `UnsupportedApiError`. Plain text works. |
| Selectors beyond tag, `#id`, `.class` and descendant | Throws `UnsupportedApiError`. |
| `Atomics.waitAsync` with a finite timeout | Throws `UnsupportedApiError`. Chrome resolves it about 5 ms late, and the reason is not pinned down. |
| `DOMContentLoaded`, `load` | Never fire. The Oracle loads its page with `document.write`, so it cannot pin their timing. |

## Prerequisites

- Node.js `^22.18.0 || >=24.12.0` (CI uses 24)
- pnpm 12.14.0, pinned by `packageManager` in `package.json`. Install it globally or run
  `corepack pnpm`. A global pnpm 10 cannot switch itself to 12. Do not use npm or yarn: pnpm
  manages the lockfile, the engine262 pin and the engine262 patch, which it reapplies
  on every install.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so pnpm only resolves versions published at
  least a day ago, and the lockfile must not contain newer ones.

## Run it

```sh
pnpm install --frozen-lockfile
pnpm dev                # http://localhost:5173
```

## Tests and checks

```sh
pnpm run type-check     # vue-tsc
pnpm exec vitest run    # unit tests (watch mode: pnpm test:unit)
pnpm run test:oracle    # differential fixtures vs recorded Chrome 155 goldens
pnpm run build-only && pnpm run check:build   # production build + build gate
pnpm exec playwright install                  # once, to download e2e browsers
pnpm test:e2e           # Playwright e2e (dev server on :5173; CI serves the built app on :4173)
```

- `pnpm run lint` runs `oxlint --fix` and `eslint --fix`, which can rewrite files, including the
  oracle fixtures. Check `git status` afterwards. CI runs `pnpm exec oxlint .` and
  `pnpm exec eslint .` without `--fix`.
- `test:oracle` needs no browser: it runs each fixture in the simulator and compares it with the
  committed `oracle/fixtures/*.golden.json`. `.github/oracle-known-failures.txt` lists the fixtures
  expected to fail until their behavior lands; CI fails on any other failure.
- `check:build` asserts that engine262 is only in the Worker chunk and that built-in function names
  survive minification (they become frame labels in the Trace).

## Re-record the oracle goldens

You only need this when you add a fixture or move to a new Chrome major. It needs a local Google
Chrome whose major version is exactly 155; the recorder refuses to run with any other version (add
a new Host Profile first).

```sh
pnpm oracle:record                  # all fixtures
pnpm oracle:record <fixture-name>   # one fixture, e.g. queue-microtask-vs-then
```

The recorder runs each fixture 5 times in Chrome (with `--js-flags=--expose-gc`, so `gc()` exists).
If the runs disagree, the fixture is non-deterministic. The page is the harness in `<head>` and the
fixture in `<body>`. Directives, each on its own line:

- `// @oracle-skip: <reason>` marks a Skipped Fixture.
- `// @oracle-module` runs the fixture as `<script type="module">`. The fixture must also contain
  module syntax (`export {}` will do), because the simulator detects modules from the source; the
  oracle test checks that both agree.
- `// @oracle-isolated` serves the page over http with COOP/COEP, so it is cross-origin isolated
  and `SharedArrayBuffer` exists.
- `// @fetch <url> ...` lines are served to Chrome by Playwright routing, with their latency, so
  both sides see the same network.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main` and `integration/v1`:

- `checks`: oxlint, eslint, type-check, unit tests
- `oracle`: `test:oracle`, gated on unexpected fixture failures
- `e2e`: installs Playwright browsers, runs `build-only`, the `check:build` gate, then Playwright
