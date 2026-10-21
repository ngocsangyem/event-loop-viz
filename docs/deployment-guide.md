# Deployment guide

The app is a static Vite single-page site. There is no backend: a share link carries the Script, so
hosting is only file serving. Target host: Vercel.

## What is in the repo

| File | Purpose |
|---|---|
| `vercel.json` | Vite framework preset, frozen-lockfile install, build = `build-only` + `check:build`, `dist/` output, SPA rewrite (everything except `/assets/`), immutable caching for hashed `/assets/*`, `nosniff` header |
| `scripts/check-production-build.mjs` | Post-build gate (`pnpm run check:build`), also run in CI |
| `vite.config.ts` | `worker.format = 'es'` and `keepNames` for the Worker chunk |

## Production build contract

- The engine (engine262) lives only in the Worker chunk (`assets/run-script-worker-*.js`). The main
  chunk (`assets/index-*.js`) must not contain it, and `index.html` must not preload the Worker.
  The Worker is created when the first Run starts.
- The Worker chunk keeps built-in function names (`keepNames`), because they become frame labels in
  the Trace. Minifying them away turns labels such as `executorClosure` into
  `(anonymous)`.
- `pnpm run check:build` asserts both (after `pnpm run build-only`), by loading the built Worker
  chunk, running a Script in it and reading the frame labels it emits. It prints raw and gzip sizes.

Sizes at the time of writing (raw / gzip): main 573.5 kB / 192.7 kB, Worker 2102.5 kB / 399.1 kB.
Vite's 500 kB chunk warning for both chunks is expected: the main chunk is CodeMirror + Vue, the
Worker chunk is the engine.

## Local verification

```sh
export PATH=/opt/homebrew/bin:$PATH   # Node 24
pnpm install --frozen-lockfile
pnpm run build-only && pnpm run check:build
pnpm exec vite preview                # serves dist/ on http://localhost:4173
```

## Deploying on Vercel (manual steps)

1. Import the GitHub repository `ngocsangyem/event-loop-viz` in the Vercel dashboard (or run
   `vercel link` once with the CLI).
2. Leave the settings from `vercel.json` as they are (framework Vite, output `dist`). In Project
   Settings set the Node.js version to 24.x (the repo requires `^22.18.0 || >=24.12.0`). Vercel
   detects pnpm from `pnpm-lock.yaml`; that pnpm then switches itself to the version pinned in
   `packageManager` (12.14.0). Setting `ENABLE_EXPERIMENTAL_COREPACK=1` in Project Settings makes
   Vercel use the pinned version directly.
3. Production branch: `main`. Every pull request gets a preview deployment automatically once the
   Git integration is connected (the "preview deploys for PRs" requirement). Keep integration
   branches as preview branches.
4. No environment variables are needed.
5. After the first deploy, verify on the deployed URL:
   - Open the site, run a Fixture Script from `oracle/fixtures/` (for example
     `queue-microtask-vs-then.js`) and compare the Observable Output with the matching Golden in
     `<name>.golden.json` beside it.
   - Run a Script using promises and confirm the Trace shows real frame labels such as `then` and
     `resolve`, not `(anonymous)` or short mangled names.
   - In DevTools, Network tab: on page load only `index-*.js` and the CSS load. The
     `run-script-worker-*.js` file is fetched when Run is first pressed.
   - Reload a deep link such as `/anything` and confirm it serves the app (SPA rewrite), and that
     `/assets/*` responses carry `Cache-Control: public, max-age=31536000, immutable`.
6. Record the bundle sizes (the table printed by `pnpm run check:build`, also visible in the Vercel
   build log) in the pull request.
