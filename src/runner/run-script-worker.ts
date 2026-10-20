// Worker entry: runs the Script off the main thread so the UI never freezes (ADR-0001).
import { runScript } from './run-script'
import type { RunSettings } from './run-script'

interface RunRequest {
  script: string
  settings: RunSettings
}

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { script, settings } = event.data
  self.postMessage(await runScript(script, settings))
}
