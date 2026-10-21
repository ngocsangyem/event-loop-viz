// One-way module dependencies:
//   renderer -> player -> trace <- host <- engine adapter; runner ties them together.
//
// Rules match the literal import specifier (relative or `@/` alias) with gitignore-style
// patterns, so they need no resolver and also cover module directories that do not exist
// yet. Flat config does not merge options of the same rule across blocks, so every block
// lists its complete restriction set.

import type { Linter } from 'eslint'

type Module = 'trace' | 'engine' | 'host' | 'runner' | 'player' | 'renderer'

const ENGINE262_GROUP = {
  group: ['@engine262/**'],
  message: 'Only src/engine may import engine262.',
}

const pathsOf = (name: Module) => [`**/${name}`, `**/${name}/**`]

/** Modules each directory may not import. Anything not listed is allowed. */
const FORBIDDEN: Record<Module, { modules: Module[]; why: string }> = {
  trace: {
    modules: ['engine', 'host', 'runner', 'player', 'renderer'],
    why: 'trace is the pure schema package and depends on nothing',
  },
  engine: {
    modules: ['runner', 'player', 'renderer'],
    why: 'the engine adapter only implements the host-owned EngineAdapter interface',
  },
  host: {
    modules: ['engine', 'runner', 'player', 'renderer'],
    why: 'host talks to the engine only through the EngineAdapter interface it owns',
  },
  runner: {
    modules: ['player', 'renderer'],
    why: 'runner ties execution together and knows nothing about presentation',
  },
  player: {
    modules: ['engine', 'host', 'runner', 'renderer'],
    why: 'player is pure replay logic over a Trace and may import trace only',
  },
  renderer: {
    modules: ['engine', 'host', 'runner'],
    why: 'renderer may import player and trace only',
  },
}

const SOURCE = '*.{ts,mts,tsx,vue}'

function restriction(module: Module, extraGroups: object[] = []): Linter.RulesRecord {
  const { modules, why } = FORBIDDEN[module]
  return {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: modules.flatMap(pathsOf), message: `Import boundary: ${why}.` },
          ...(module === 'engine' ? [] : [ENGINE262_GROUP]),
          ...extraGroups,
        ],
      },
    ],
  }
}

// Modules that must stay free of third-party code, except in their test files.
const DEPENDENCY_FREE: Partial<Record<Module, object>> = {
  trace: { regex: '^[^.]', message: 'trace has no dependencies: relative imports only.' },
  player: {
    group: ['vue', 'vue/**', '@vue/**', 'pinia'],
    message: 'player is framework-free: no Vue.',
  },
}

function moduleBlocks(module: Module): Linter.Config[] {
  const extra = DEPENDENCY_FREE[module]
  if (!extra) {
    return [
      {
        name: `import-boundaries/${module}`,
        files: [`src/${module}/**/${SOURCE}`],
        rules: restriction(module),
      },
    ]
  }
  return [
    {
      name: `import-boundaries/${module}`,
      files: [`src/${module}/**/${SOURCE}`],
      ignores: [`src/${module}/**/__tests__/**`],
      rules: restriction(module, [extra]),
    },
    {
      name: `import-boundaries/${module}-tests`,
      files: [`src/${module}/**/__tests__/**/${SOURCE}`],
      rules: restriction(module),
    },
  ]
}

// The Scene is a pure function of the player's ReplayState: its files may import their own
// siblings (`./x`), Vue, and player *types*. A negative-lookahead regex lets everything else
// through to the error, so a new module directory is forbidden by default rather than by name.
const SCENE_ALLOWED_SPECIFIER = String.raw`^(?!\./|vue$|(\.\./\.\./|@/)player(/|$))`
const SCENE_FILES = [`src/renderer/scene/**/${SOURCE}`]
const SCENE_TESTS = ['src/renderer/scene/**/__tests__/**']

const sceneBlocks: Linter.Config[] = [
  {
    name: 'import-boundaries/renderer-scene',
    files: SCENE_FILES,
    ignores: SCENE_TESTS,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: SCENE_ALLOWED_SPECIFIER,
              message:
                'Import boundary: Scene components import only their own files, vue and player types.',
            },
          ],
        },
      ],
      // Types are erased at build time, so only value imports from the player are a leak.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: pathsOf('player'),
              allowTypeImports: true,
              message: 'Import boundary: Scene components import player types only.',
            },
          ],
        },
      ],
    },
  },
]

export const importBoundaryConfigs: Linter.Config[] = [
  // Everything outside the module directories (app entry, stores, oracle): engine262 only.
  {
    name: 'import-boundaries/engine262-only-in-engine',
    files: [`src/**/${SOURCE}`, `oracle/**/${SOURCE}`],
    ignores: ['src/engine/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [ENGINE262_GROUP] }] },
  },
  ...(['trace', 'engine', 'host', 'runner', 'player', 'renderer'] as const).flatMap(moduleBlocks),
  // After the renderer block: for scene files this block's rule options win.
  ...sceneBlocks,
]
