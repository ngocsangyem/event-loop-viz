// Modules: running the Script as a module, `import` of data: URLs and dynamic `import()`.
import * as E from '@engine262/engine262'
import type { CallbackHandle, HostBindings, ScriptOutcome, UncaughtError } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { EngineValue } from './engine262-types'
import type { EngineRunState } from './engine-run-state'
import type { Invocation } from './host-callbacks'
import { isJavaScriptMimeType, processDataUrl } from './data-url'
import type { Markable } from './web-idl-helpers'

/** The URL of the Script itself: the Oracle's page is about:blank and the module is inline. */
export const PAGE_URL = 'about:blank'

type ModuleRecord = {
  LoadRequestedModules(): EngineValue
  Link(): unknown
  Evaluate(): Generator<unknown, unknown, unknown>
  HostDefined?: { public?: { url: string } }
}
type Payload = { data: unknown }
type Referrer = { HostDefined?: { public?: { url: string } } }

interface Resolved {
  url?: string
  /** The message of the TypeError a failed resolution throws. */
  error?: string
}

export interface ModuleLoaderDeps {
  state: EngineRunState
  bindings: HostBindings
  register(invocation: Invocation, info?: CallbackInfo, roots?: Markable): CallbackHandle
  /** Reports an exception as the Script's (HTML report the exception, then `error` fires). */
  reportError(error: EngineValue, report: (e: UncaughtError) => void): void
}

export function createModuleLoader(deps: ModuleLoaderDeps) {
  const { state } = deps
  /** Module map: one record per URL, so a module evaluates once however often it is imported. */
  const moduleMap = new Map<string, unknown>()

  const typeError = (message: string) => E.Throw.TypeError(message)
  const urlOf = (referrer: unknown) => (referrer as Referrer).HostDefined?.public?.url ?? PAGE_URL

  /** HTML resolve a module specifier against the referrer's URL (Chrome 155 messages). */
  function resolve(specifier: string, base: string, dynamic: boolean): Resolved {
    try {
      return { url: new URL(specifier).href }
    } catch {
      // Not absolute: only "/", "./" and "../" may be relative to the base.
    }
    if (dynamic) {
      return {
        error: `Failed to resolve module specifier '${specifier}'. The base URL is ${base} because import() is called from a CORS-cross-origin script.`,
      }
    }
    if (/^(\/|\.\/|\.\.\/)/.test(specifier)) {
      try {
        return { url: new URL(specifier, base).href }
      } catch {
        return { error: `Failed to resolve module specifier "${specifier}". Invalid relative url or base scheme isn't hierarchical.` }
      }
    }
    return { error: `Failed to resolve module specifier "${specifier}". Relative references must start with either "/", "./", or "../".` }
  }

  /** Fetches and parses a module: only data: URLs with a JavaScript MIME type load. */
  function fetchModule(url: string): unknown {
    const cached = moduleMap.get(url)
    if (cached) return E.NormalCompletion(cached as never)
    const resource = url.startsWith('data:') ? processDataUrl(url) : undefined
    if (!resource || !isJavaScriptMimeType(resource.mimeType)) {
      return typeError(`Failed to fetch dynamically imported module: ${url}`)
    }
    const source = new TextDecoder().decode(resource.body)
    const compiled = state.realm.compileModule(source, { specifier: url, public: { url } })
    if (compiled instanceof E.ThrowCompletion) return compiled
    const record = E.ValueOfNormalCompletion(compiled)
    moduleMap.set(url, record)
    return E.NormalCompletion(record as never)
  }

  /** engine262 HostLoadImportedModule: static imports load at once, `import()` in a networking Task. */
  function hostLoadImportedModule(referrer: unknown, moduleRequest: { Specifier: unknown }, _hostDefined: unknown, payload: Payload) {
    const finish = (completion: unknown) =>
      E.FinishLoadingImportedModule(referrer as never, moduleRequest as never, payload as never, completion as never)
    const specifier = String(moduleRequest.Specifier instanceof E.JSStringValue ? moduleRequest.Specifier.stringValue() : moduleRequest.Specifier)
    const dynamic = !(payload.data instanceof E.GraphLoadingState)
    const resolved = resolve(specifier, urlOf(referrer), dynamic)
    // A failed resolution settles at once (Chrome rejects import('x') before older microtasks run).
    if (resolved.error !== undefined) return finish(typeError(resolved.error))
    if (!dynamic) return finish(fetchModule(resolved.url!))
    const url = resolved.url!
    const detail = url.length > 48 ? `${url.slice(0, 45)}...` : url
    const { opId, taskId } = deps.bindings.startWebApi({ api: 'import', detail, callback: { kind: 'builtin', name: 'import()' } })
    const handle = deps.register(
      { kind: 'steps', steps: (caller) => caller.internal(() => finish(fetchModule(url))) },
      { kind: 'builtin', name: 'import()' },
      { mark: (m) => m((payload.data as { Promise?: unknown }).Promise) },
    )
    deps.bindings.queueTask('networking', handle, { opId, taskId })
  }

  /** Runs `fn` with the realm's top context pushed, without the push showing in the Trace. */
  const inTopContext = <T>(fn: () => T): T => {
    state.hostDepth++
    const pop = state.realm.pushTopContext()
    state.hostDepth--
    try {
      return fn()
    } finally {
      state.hostDepth++
      pop?.()
      state.hostDepth--
    }
  }

  /**
   * HTML run a module script: load the static imports, link, evaluate. A rejected evaluation
   * (a throw, or a top-level await that rejects) is reported upon rejection, so after the
   * microtasks the module queued (Chrome 155: `m`, then the uncaught error).
   */
  function evaluateModule(record: unknown, report: (e: UncaughtError) => void): ScriptOutcome {
    const module = record as ModuleRecord
    return inTopContext(() => {
      // Loading and linking run no Script code; their internal promise is the host's business, so
      // its rejection is not an unhandled rejection of the page.
      state.hostDepth++
      let loading: { PromiseState: string; PromiseResult: EngineValue }
      let linked: unknown
      try {
        loading = module.LoadRequestedModules() as unknown as typeof loading
        linked = loading.PromiseState === 'rejected' ? undefined : E.EnsureCompletion(module.Link() as never)
      } finally {
        state.hostDepth--
      }
      if (loading.PromiseState === 'rejected') {
        deps.reportError(loading.PromiseResult, report)
        return { kind: 'ok', sourceType: 'module' }
      }
      if (linked instanceof E.ThrowCompletion) {
        deps.reportError((linked as { Value: EngineValue }).Value, report)
        return { kind: 'ok', sourceType: 'module' }
      }
      const evaluation = E.EnsureCompletion(E.skipDebugger(module.Evaluate() as never))
      const promise = (evaluation as unknown as { Value: { PromiseState: string } }).Value
      if (promise.PromiseState !== 'fulfilled') {
        const onRejected = E.CreateBuiltinFunction.from(((reason = E.Value.undefined) => {
          deps.reportError(reason, report)
          return E.Value.undefined
        }) as never, 'report the exception')
        E.PerformPromiseThen(promise as never, E.Value.undefined, onRejected as never)
      }
      return { kind: 'ok', sourceType: 'module' }
    })
  }

  return {
    /** The module map keeps every loaded module (and its environment) alive, as in a browser. */
    mark: (m: (value: unknown) => void) => moduleMap.forEach(m),
    hostLoadImportedModule,
    evaluateModule,
    /** import.meta.url: the data: URL of an imported module, about:blank for the Script. */
    importMetaProperties: (module: unknown) => [
      { Key: E.Value('url'), Value: E.Value((module as { url?: string } | undefined)?.url ?? PAGE_URL) },
    ],
  }
}
