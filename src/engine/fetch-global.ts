// fetch, Response and Headers. The network is `data:` URLs plus the Script's `// @fetch` mocks.
import * as E from '@engine262/engine262'
import type { CallbackHandle, HostBindings } from '../host/engine-adapter'
import type { CallbackInfo } from '../trace/trace-event'
import type { FetchMock } from '../host/fetch-mock-directives'
import { STATUS_TEXT } from '../host/fetch-mock-directives'
import type { EngineValue } from './engine262-types'
import type { Invocation } from './host-callbacks'
import { processDataUrl } from './data-url'
import {
  bool,
  createHostObject,
  defineAttribute,
  defineData,
  defineInterface,
  defineMethod,
  failedToExecute,
  hostDataOf,
  isCallable,
  makeFunction,
  num,
  run,
  str,
  toDOMString,
  typeError,
} from './web-idl-helpers'
import type { Markable, ObjectValue } from './web-idl-helpers'

type Realm = InstanceType<typeof E.ManagedRealm>
type Capability = { Promise: EngineValue; Resolve: EngineValue; Reject: EngineValue }

/**
 * Task hops a body read takes before its promise settles, measured in Chrome 155: a `data:`
 * body resolves `text()` after two more tasks, a network body after one.
 */
const BODY_HOPS = { data: 2, network: 1 } as const

interface ResponseInit {
  status: number
  statusText: string
  type: 'basic' | 'cors'
  url: string
  headers: [string, string][]
  body: Uint8Array
  hops: number
}

class ResponseData {
  bodyUsed = false
  constructor(
    readonly init: ResponseInit,
    readonly headers: ObjectValue,
  ) {}
  mark(m: (value: unknown) => void) {
    m(this.headers)
  }
}
class HeadersData {
  constructor(readonly entries: [string, string][]) {}
  mark() {}
}
const isResponseData = (d: unknown): d is ResponseData => d instanceof ResponseData
const isHeadersData = (d: unknown): d is HeadersData => d instanceof HeadersData

export interface FetchDeps {
  realm: Realm
  global: ObjectValue
  bindings: HostBindings
  mocks: readonly FetchMock[]
  register(invocation: Invocation, info?: CallbackInfo, roots?: Markable): CallbackHandle
}

export function installFetch(deps: FetchDeps) {
  const { realm, global, bindings } = deps
  const intrinsic = (name: string) => realm.Intrinsics[name as keyof typeof realm.Intrinsics] as unknown as ObjectValue
  const newCapability = () => run<Capability>(E.NewPromiseCapability(intrinsic('%Promise%') as never))
  const settle = (fn: EngineValue, value: EngineValue) => run(E.Call(fn as never, E.Value.undefined, [value] as never))
  const typeErrorValue = (message: string) => (E.Throw.TypeError(message) as unknown as { Value: EngineValue }).Value
  const rejected = (message: string) => {
    const capability = newCapability()
    settle(capability.Reject, typeErrorValue(message))
    return capability.Promise
  }

  /** Queues a networking Task that settles `capability` with `settleSteps()` once `delayMs` passed. */
  const networkTask = (
    capability: Capability,
    op: { api: 'fetch' | 'body'; detail: string; delayMs?: number; name: string },
    settleSteps: () => { fulfill: EngineValue } | { reject: EngineValue },
    roots: EngineValue[] = [],
  ) => {
    const { opId, taskId } = bindings.startWebApi({
      api: op.api,
      detail: op.detail,
      callback: { kind: 'builtin', name: op.name },
      ...(op.delayMs !== undefined && { delayMs: op.delayMs }),
    })
    const handle = deps.register(
      {
        kind: 'steps',
        steps: (caller) =>
          caller.internal(() => {
            const outcome = settleSteps()
            if ('fulfill' in outcome) settle(capability.Resolve, outcome.fulfill)
            else settle(capability.Reject, outcome.reject)
            return E.Value.undefined
          }),
      },
      { kind: 'builtin', name: op.name },
      { mark: (m) => [capability.Promise, capability.Resolve, capability.Reject, ...roots].forEach(m) },
    )
    bindings.queueTask('networking', handle, { opId, taskId, ...(op.delayMs !== undefined && { delayMs: op.delayMs }) })
  }

  // --- Headers -----------------------------------------------------------------------------
  const Headers = defineInterface(realm, global, 'Headers', {
    construct: () => createHostObject(Headers.prototype, new HeadersData([])),
  })
  const headersOf = (t: EngineValue, operation: string) =>
    hostDataOf(t, isHeadersData) ?? typeError(failedToExecute(operation, 'Headers', 'Illegal invocation'))
  defineMethod(realm, Headers.prototype, 'get', 1, (args, { thisValue }) => {
    const name = toDOMString(args[0] ?? E.Value.undefined).toLowerCase()
    const values = headersOf(thisValue, 'get').entries.filter(([key]) => key === name).map(([, v]) => v)
    return values.length ? str(values.join(', ')) : E.Value.null
  })
  defineMethod(realm, Headers.prototype, 'has', 1, (args, { thisValue }) => {
    const name = toDOMString(args[0] ?? E.Value.undefined).toLowerCase()
    return bool(headersOf(thisValue, 'has').entries.some(([key]) => key === name))
  })
  defineMethod(realm, Headers.prototype, 'forEach', 1, (args, { thisValue }) => {
    const callback = args[0] ?? E.Value.undefined
    if (!isCallable(callback)) typeError(failedToExecute('forEach', 'Headers', "The callback provided as parameter 1 is not a function."))
    for (const [key, value] of headersOf(thisValue, 'forEach').entries) {
      run(E.Call(callback as never, (args[1] ?? E.Value.undefined) as never, [str(value), str(key), thisValue] as never))
    }
  })

  // --- Response ----------------------------------------------------------------------------
  const Response = defineInterface(realm, global, 'Response')
  const createResponse = (init: ResponseInit) =>
    createHostObject(Response.prototype, new ResponseData(init, createHostObject(Headers.prototype, new HeadersData(init.headers))))
  const responseOf = (t: EngineValue, operation: string) =>
    hostDataOf(t, isResponseData) ?? typeError(failedToExecute(operation, 'Response', 'Illegal invocation'))
  const attr = (name: string, get: (d: ResponseData) => EngineValue) =>
    defineAttribute(realm, Response.prototype, name, (t) => get(responseOf(t, name)))
  attr('status', (d) => num(d.init.status))
  attr('ok', (d) => bool(d.init.status >= 200 && d.init.status <= 299))
  attr('statusText', (d) => str(d.init.statusText))
  attr('type', (d) => str(d.init.type))
  attr('url', (d) => str(d.init.url))
  attr('redirected', () => E.Value.false)
  attr('headers', (d) => d.headers)
  attr('bodyUsed', (d) => bool(d.bodyUsed))

  /** text() / json() / arrayBuffer(): the body settles after BODY_HOPS networking Tasks. */
  const bodyMethod = (name: 'text' | 'json' | 'arrayBuffer', convert: (bytes: Uint8Array) => { fulfill: EngineValue } | { reject: EngineValue }) =>
    defineMethod(realm, Response.prototype, name, 0, (_args, { thisValue }) => {
      const data = responseOf(thisValue, name)
      if (data.bodyUsed) return rejected(failedToExecute(name, 'Response', 'body stream already read'))
      data.bodyUsed = true
      const capability = newCapability()
      const label = `Response.${name}()`
      const roots: Markable = { mark: (m) => [capability.Promise, capability.Resolve, capability.Reject].forEach(m) }
      // `hops` networking Tasks: each but the last queues the next; the last settles the promise.
      const queueHop = (remaining: number, first: boolean) => {
        const last = remaining === 1
        const info: CallbackInfo = { kind: 'builtin', name: last ? label : 'read body' }
        const handle = deps.register(
          {
            kind: 'steps',
            steps: (caller) => {
              if (!last) return queueHop(remaining - 1, false)
              caller.internal(() => {
                const outcome = convert(data.init.body)
                if ('fulfill' in outcome) settle(capability.Resolve, outcome.fulfill)
                else settle(capability.Reject, outcome.reject)
                return E.Value.undefined
              })
            },
          },
          info,
          roots,
        )
        if (!first) {
          bindings.queueTask('networking', handle)
          return
        }
        const { opId, taskId } = bindings.startWebApi({ api: 'body', detail: label, callback: info })
        bindings.queueTask('networking', handle, { opId, taskId })
      }
      queueHop(data.init.hops, true)
      return capability.Promise
    })
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
  bodyMethod('text', (bytes) => ({ fulfill: str(decode(bytes)) }))
  bodyMethod('json', (bytes) => {
    const parse = run<EngineValue>(E.Get(intrinsic('%JSON%') as never, E.Value('parse')))
    const completion = E.EnsureCompletion(E.skipDebugger(E.Call(parse as never, E.Value.undefined, [str(decode(bytes))] as never)))
    return completion instanceof E.ThrowCompletion ? { reject: completion.Value as EngineValue } : { fulfill: completion.Value as EngineValue }
  })
  bodyMethod('arrayBuffer', (bytes) => {
    const buffer = run<ObjectValue>(E.Construct(intrinsic('%ArrayBuffer%') as never, [num(bytes.length)] as never))
    ;((buffer as unknown as { ArrayBufferData: Uint8Array }).ArrayBufferData).set(bytes)
    return { fulfill: buffer }
  })
  defineMethod(realm, Response.prototype, 'clone', 0, (_args, { thisValue }) => {
    const data = responseOf(thisValue, 'clone')
    if (data.bodyUsed) typeError(failedToExecute('clone', 'Response', 'Response body is already used'))
    return createResponse(data.init)
  })

  // --- fetch -------------------------------------------------------------------------------
  defineData(
    global,
    'fetch',
    makeFunction(realm, 'fetch', 1, (args) => {
      // A promise-returning operation turns every error into a rejection (Web IDL).
      if (args.length < 1) return rejected(failedToExecute('fetch', 'Window', '1 argument required, but only 0 present.'))
      const input = toDOMString(args[0]!)
      let url: URL
      try {
        // The page is about:blank, so a relative URL has no base to resolve against.
        url = new URL(input)
      } catch {
        return rejected(failedToExecute('fetch', 'Window', `Failed to parse URL from ${input}`))
      }
      const href = url.href.replace(/#.*$/, '')
      const capability = newCapability()
      const networkError = () => ({ reject: typeErrorValue('Failed to fetch') })
      if (url.protocol === 'data:') {
        const resource = processDataUrl(url.href)
        networkTask(capability, { api: 'fetch', detail: shorten(href), name: 'fetch response' }, () =>
          resource
            ? {
                fulfill: createResponse({
                  status: 200,
                  statusText: 'OK',
                  type: 'basic',
                  url: href,
                  headers: [['content-type', resource.mimeType]],
                  body: resource.body,
                  hops: BODY_HOPS.data,
                }),
              }
            : networkError(),
        )
        return capability.Promise
      }
      const mock = url.protocol === 'http:' || url.protocol === 'https:' ? findMock(href) : undefined
      if (!mock) {
        // No mock: the request fails as it does in an offline browser.
        networkTask(capability, { api: 'fetch', detail: shorten(href), name: 'fetch response' }, networkError)
        return capability.Promise
      }
      networkTask(capability, { api: 'fetch', detail: shorten(href), delayMs: mock.latencyMs, name: 'fetch response' }, () => ({
        fulfill: createResponse({
          status: mock.status,
          statusText: STATUS_TEXT[mock.status] ?? '',
          type: 'cors',
          url: href,
          headers: [['content-type', mock.contentType]],
          body: new TextEncoder().encode(mock.body),
          hops: BODY_HOPS.network,
        }),
      }))
      return capability.Promise
    }),
    { enumerable: true },
  )

  /** The last `// @fetch` line for this URL wins. */
  function findMock(href: string): FetchMock | undefined {
    for (let i = deps.mocks.length - 1; i >= 0; i--) {
      const mock = deps.mocks[i]!
      try {
        if (new URL(mock.url).href.replace(/#.*$/, '') === href) return mock
      } catch {
        // A directive with an unparsable URL never matches.
      }
    }
    return undefined
  }
}

/** Card label: long data: URLs are cut so the Web APIs panel stays readable. */
const shorten = (href: string) => (href.length > 48 ? `${href.slice(0, 45)}...` : href)
