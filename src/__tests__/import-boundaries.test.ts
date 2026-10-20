// @vitest-environment node
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

// Lints in-memory source with the repo's real ESLint config, as if it lived at `filePath`.
const eslint = new ESLint({ cwd: process.cwd() })

async function boundaryViolations(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === 'no-restricted-imports')
    .map((m) => m.message)
}

describe('import boundaries', () => {
  // [importing file, import statement]
  const forbidden: [string, string][] = [
    ['src/renderer/app.ts', "import { runHost } from '../host/event-loop-host'"],
    ['src/renderer/app.ts', "import { runHost } from '@/host/event-loop-host'"],
    [
      'src/renderer/scene/stack.ts',
      "import { createEngine262Adapter } from '../../engine/engine262-adapter'",
    ],
    ['src/renderer/app.ts', "import { runScript } from '../runner/run-script'"],
    ['src/renderer/app.ts', "import type { EngineAdapter } from '../host/engine-adapter'"],
    ['src/renderer/app.ts', "import * as E from '@engine262/engine262'"],
    ['src/player/state-at.ts', "import { runHost } from '../host/event-loop-host'"],
    ['src/player/state-at.ts', "import { ref } from 'vue'"],
    ['src/player/state-at.ts', "import { App } from '../renderer/app'"],
    ['src/trace/format-value.ts', "import { stateAt } from '../player/state-at'"],
    ['src/trace/format-value.ts', "import { ref } from 'vue'"],
    [
      'src/host/event-loop-host.ts',
      "import { createEngine262Adapter } from '../engine/engine262-adapter'",
    ],
    ['src/host/event-loop-host.ts', "import type { Realm } from '@engine262/engine262'"],
    ['src/runner/run-script.ts', "import * as E from '@engine262/engine262'"],
    ['src/runner/run-script.ts', "import { stateAt } from '../player/state-at'"],
    ['src/engine/engine262-adapter.ts', "import { runScript } from '../runner/run-script'"],
    ['src/main.ts', "import * as E from '@engine262/engine262'"],
    ['src/stores/counter.ts', "import * as E from '@engine262/engine262'"],
    [
      'src/renderer/components/panel.vue',
      '<script setup lang="ts">\nimport { runHost } from \'../../host/event-loop-host\'\n</script>',
    ],
  ]

  it.each(forbidden)('rejects %s: %s', async (filePath, code) => {
    expect(await boundaryViolations(filePath, code)).not.toEqual([])
  })

  const allowed: [string, string][] = [
    ['src/renderer/app.ts', "import { stateAt } from '../player/state-at'"],
    ['src/renderer/app.ts', "import type { Trace } from '@/trace/trace-event'"],
    ['src/renderer/app.ts', "import { ref } from 'vue'"],
    ['src/renderer/scene/stack.ts', "import type { ReplayState } from '../../player/replay-state'"],
    ['src/player/state-at.ts', "import type { Trace } from '../trace/trace-event'"],
    ['src/trace/derive-observable-output.ts', "import type { TraceEvent } from './trace-event'"],
    ['src/trace/__tests__/derive.test.ts', "import { describe } from 'vitest'"],
    ['src/host/event-loop-host.ts', "import type { EngineAdapter } from './engine-adapter'"],
    ['src/host/event-loop-host.ts', "import type { Trace } from '../trace/trace-event'"],
    ['src/engine/engine262-adapter.ts', "import * as E from '@engine262/engine262'"],
    [
      'src/engine/engine262-adapter.ts',
      "import type { EngineAdapter } from '../host/engine-adapter'",
    ],
    [
      'src/runner/run-script.ts',
      "import { createEngine262Adapter } from '../engine/engine262-adapter'",
    ],
    ['src/runner/run-script.ts', "import { runHost } from '../host/event-loop-host'"],
    ['src/main.ts', "import App from './App.vue'"],
  ]

  it.each(allowed)('allows %s: %s', async (filePath, code) => {
    expect(await boundaryViolations(filePath, code)).toEqual([])
  })
})
