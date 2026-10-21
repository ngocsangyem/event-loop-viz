# Event Loop Visualizer

Paste a JavaScript Script, press Run, and replay every step of the Run against a simulated browser
event loop: call stack, microtask queue, task queue, timers, Virtual Clock and console.

**Correctness claim.** The Observable Output of a Run (console lines, uncaught exceptions,
unhandled rejections) equals what Chrome 155 produces for the same Script. This is proven by
differential tests that run each fixture in real Chrome and in the simulator and compare the two
outputs (ADR-0002, ADR-0008). The app targets one Host Profile, `chrome-155`.

Live site: not deployed yet. The maintainer deploys manually by following
[docs/deployment-guide.md](docs/deployment-guide.md); the URL will be added here afterwards.

## How it works

The Script runs in [engine262](https://github.com/engine262/engine262) behind a hand-written HTML
event-loop host on a Virtual Clock, inside a Web Worker. A Run produces one immutable Trace. The UI
never drives the engine: it replays the Trace (play/pause, step, jump by Tick or Task, scrubber,
source highlighting). Architecture: [docs/system-architecture.md](docs/system-architecture.md).
Status and plans: [docs/project-roadmap.md](docs/project-roadmap.md). Terms are defined in
[GLOSSARY.md](GLOSSARY.md); decisions are in [docs/adr/](docs/adr/).

## Supported APIs (ADR-0006, ADR-0010)

- Everything engine262 implements: Promise, async/await, generators, async generators, `for await`.
- `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`
- `queueMicrotask`
- `MessageChannel`, `port.postMessage`, `port.onmessage`, `port.start()`, `port.close()`
- `console.log`, `console.info`, `console.warn`, `console.error`
- `Date.now()` and `performance.now()` (they read the Virtual Clock)
- Scripts run as classic scripts. `Math.random` is seeded per Run.

## Unsupported APIs (ADR-0006, ADR-0010)

`fetch`, the DOM (`document`, `window`), `requestAnimationFrame`, `window.postMessage`,
`addEventListener` (including `addEventListener('message')`), `MessagePort` transfer, modules and
`import`, `FinalizationRegistry`, `WeakRef`, `Atomics.wait`, `SharedArrayBuffer`.

Each one exists as a stub that throws `UnsupportedApiError` naming the API, and a pre-run scan lists
them before the Run. The app never guesses at their ordering. `requestAnimationFrame` is the first
candidate for v1.1 (see the roadmap).

## Prerequisites

- Node.js `^22.18.0 || >=24.12.0` (CI uses 24)
- pnpm 12.14.0, pinned by `packageManager` in `package.json` (an older global pnpm switches to it
  by itself; `corepack pnpm` also works). Do not use npm or yarn: the lockfile, the engine262 pin
  and the engine262 patch (ADR-0009, reapplied automatically on install) are managed by pnpm.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`: pnpm only resolves package versions that
  have been published for at least a day, and the lockfile must not contain newer ones.

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
  committed `oracle/fixtures/*.golden.json`. Fixtures that fail until their behavior lands are
  listed in `.github/oracle-known-failures.txt`; CI fails on any other failure.
- `check:build` asserts that engine262 is only in the Worker chunk and that built-in function names
  survive minification (they become frame labels in the Trace).

## Re-record the oracle goldens

Only needed when adding a fixture or bumping the Chrome major. It needs a local Google Chrome whose
major version is exactly 155; otherwise the recorder refuses to run (add a new Host Profile first,
ADR-0008).

```sh
pnpm oracle:record                  # all fixtures
pnpm oracle:record <fixture-name>   # one fixture, e.g. queue-microtask-vs-then
```

Each fixture is run 5 times in Chrome; the runs must agree or the fixture is non-deterministic.
A `// @oracle-skip: <reason>` line at the top of a fixture marks a Skipped Fixture.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main` and `integration/v1`:

- `checks`: oxlint, eslint, type-check, unit tests
- `oracle`: `test:oracle`, gated on unexpected fixture failures
- `e2e`: installs Playwright browsers, runs `build-only`, the `check:build` gate, then Playwright
