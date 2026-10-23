// Loads the app's own TypeScript modules (engine, host, player) into Node through Vite's SSR
// loader, so lesson timelines come from the same runScript() the app runs, not a copy of it.
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))

/** Starts a module-only Vite server and returns `load(path)` plus `close()`. */
export async function openAppModules() {
  process.env.ELV_E2E = '1' // skips the DevTools plugin, which has no use in a headless loader
  const server = await createServer({
    root: repoRoot,
    configFile: `${repoRoot}vite.config.ts`,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  })
  return {
    load: (path) => server.ssrLoadModule(path),
    close: () => server.close(),
  }
}
