// Runs the Script: as a classic script, or as a module when only a module parse accepts it.
import * as E from '@engine262/engine262'
import type { ScriptOutcome } from '../host/engine-adapter'
import type { EngineValue } from './engine262-types'
import type { EngineRunState } from './engine-run-state'

interface SyntaxSite {
  message: string
  line: number
  column: number
}

export interface EntryScriptDeps {
  errorMessage(value: EngineValue): string
  reportError(error: EngineValue): void
  evaluateModule(record: unknown): ScriptOutcome
  pageUrl: string
}

const siteOf = (error: EngineValue, errorMessage: (v: EngineValue) => string): SyntaxSite => {
  const site = (error as unknown as { HostDefinedStack?: { lineNumber: number; columnNumber: number }[] }).HostDefinedStack?.[0]
  return {
    message: errorMessage(error).split('\n')[0] ?? 'SyntaxError',
    line: site?.lineNumber ?? 1,
    column: site?.columnNumber ?? 1,
  }
}

/**
 * Auto-detects modules: `import` / `export` declarations, top-level `await` and `import.meta` are
 * syntax errors in a classic script, so a Script that fails as one and parses as a module runs as
 * a module. When both parses fail, the error further into the source is the relevant one.
 */
export function evaluateEntryScript(state: EngineRunState, source: string, deps: EntryScriptDeps): ScriptOutcome {
  const { realm } = state
  state.source = source
  const compiled = realm.compileScript(source, { specifier: 'user.js' })
  if (compiled instanceof E.ThrowCompletion) {
    const asModule = realm.compileModule(source, { specifier: deps.pageUrl, public: { url: deps.pageUrl } })
    const scriptError = siteOf(compiled.Value, deps.errorMessage)
    if (asModule instanceof E.ThrowCompletion) {
      const moduleError = siteOf(asModule.Value, deps.errorMessage)
      const later = moduleError.line > scriptError.line || (moduleError.line === scriptError.line && moduleError.column > scriptError.column)
      return { kind: 'syntax-error', ...(later ? moduleError : scriptError) }
    }
    const record = E.ValueOfNormalCompletion(asModule)
    state.scriptRoot = (record as unknown as { ECMAScriptCode: object }).ECMAScriptCode
    return deps.evaluateModule(record)
  }
  const script = E.ValueOfNormalCompletion(compiled)
  state.scriptRoot = (script as unknown as { ECMAScriptCode: object }).ECMAScriptCode
  state.scriptRunning = true
  try {
    const completion = E.EnsureCompletion(realm.evaluateScriptSkipDebugger(script))
    if (completion instanceof E.ThrowCompletion) deps.reportError(completion.Value)
  } finally {
    state.scriptRunning = false
  }
  return { kind: 'ok', sourceType: 'script' }
}
