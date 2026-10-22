# Host API Semantics: Chrome 155 Ground Truth

Measured facts behind the host APIs added after v1: `fetch`, the DOM (`document`, `window`),
`requestAnimationFrame`, `window.postMessage`, `addEventListener`, `MessagePort` transfer, modules
and `import`, `FinalizationRegistry`, `WeakRef`, `Atomics.wait`, `SharedArrayBuffer`.

## Method

- Chrome 155.0.8059.85 (the Host Profile `chrome-155` pin), headless, through Playwright, with
  `--js-flags=--expose-gc`. Every probe ran 5 times. "Stable" means all 5 Observable Outputs were
  identical.
- Same harness as `oracle/record-golden-in-chrome.mjs` (console capture, `error`,
  `unhandledrejection`, `rejectionhandled` listeners). Probes ran through `page.setContent`, so the
  page is `about:blank` (origin `"null"`) unless noted. "isolated" = served over http with
  `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
- Network responses for `https://` URLs were served by Playwright `page.route` with
  `access-control-allow-origin: *`.
- About 140 probes in total. Everything below is stable unless marked **varies**.

## Task ordering rule

Every "ready now" task (port message, posted message, networking, JavaScript engine) joins the
host-wide FIFO at the moment it is queued, and the existing cross-source rule holds: the task
enqueued first runs first, including against a timer whose due time has passed. Verified for
`window.postMessage` vs `setTimeout(0)` (both orders), `window.postMessage` vs `MessageChannel`
(both orders), `fetch(data:)` vs `setTimeout(0)` (both orders), `fetch(data:)` vs `MessageChannel`,
`import(data:)` vs `MessageChannel`, `Atomics.waitAsync` wake vs `MessageChannel`.

## requestAnimationFrame

| Probe | Chrome |
|---|---|
| two rAF, first queues a promise reaction | `raf1, raf1-micro, raf2` (checkpoint after each callback) |
| rAF then `setTimeout(0)` / `setTimeout(0)` then rAF | `t0, raf` |
| rAF vs `setTimeout(1)`, `setTimeout(4)` | **varies** |
| rAF vs `setTimeout(8 / 12 / 16 / 17 / 20 / 25 / 33)` | `raf` first |
| rAF vs `MessageChannel` message | `msg, raf` |
| rAF nested in rAF | runs in the next frame, after the sibling callbacks |
| all callbacks of one frame | same timestamp argument; timestamp <= `performance.now()` |
| `cancelAnimationFrame` | cancelled callback never runs, also when cancelled by an earlier callback of the same frame |
| callback throws | reported, the next callback still runs |
| rAF inside a timer, plus `setTimeout(0)` there | `t-inner, raf` |
| 30 ms busy script, then rAF and `setTimeout(0)` | `raf, t0` (the frame missed during the script runs first) |
| ids | own counter: `1, 2` for rAF while `setTimeout` returns `1` |
| first frame | 2 to 7 ms after the script started (**varies**), then every 16.7 ms |
| `requestAnimationFrame(1)` | `TypeError: Failed to execute 'requestAnimationFrame' on 'Window': parameter 1 is not of type 'Function'.` |

Model: rendering opportunities sit on a 60 Hz grid that starts 4 ms after the Run starts. A grid
point that passes while a task runs is not lost: the next rendering step is due at that missed
point, so it runs before tasks queued later. A grid point that passes while the loop is idle with no
callback waiting is consumed. A Run with a timer due within 3 ms of a frame is Timing-sensitive.

## window.postMessage, MessagePort, events

- `postMessage(data, '*')` queues one task on the posted message task source; listeners of the
  `message` event on `window` run in registration order (`onmessage` sits where it was first set),
  with a microtask checkpoint after each listener.
- `event.origin` is `"null"` on `about:blank`, `event.source === window`, `event.ports.length` is 0,
  `event.isTrusted` is true, constructor `MessageEvent`. `postMessage(x)` without a target origin
  delivers (default `/`). A mismatching target origin drops the message silently.
- Data is structured-cloned: later mutation is invisible; `Date`, `Map`, `Set`, `RegExp`, `Error`,
  `BigInt`, holes, `undefined` properties and cycles survive; class instances become plain objects
  without prototype getters. A function or a symbol throws `DataCloneError`:
  `Failed to execute 'postMessage' on 'Window': f(){} could not be cloned.` (the value's source text
  or `Symbol(x)`), and `... on 'MessagePort': ...` for ports.
- `MessagePort`: `addEventListener('message')` needs `start()`; setting `onmessage` starts the port.
  Listeners and `onmessage` run in registration order with a checkpoint after each. A message posted
  before `close()` is never delivered.
- `dispatchEvent` and `element.click()` from script are synchronous: listeners run on the stack,
  microtasks wait for the script's checkpoint. A listener that throws is reported and the next one
  still runs. Capture listeners on ancestors run first, then the target, then bubbling listeners;
  `click()` bubbles to `document` and `window` only once the element is in the document.
  `once`, duplicate registration, removal during dispatch, `stopImmediatePropagation`,
  `preventDefault` (return value `false`), `handleEvent` objects and `CustomEvent.detail` behave as
  in the DOM standard.
- `error` listeners on `window` run after the exception is reported, with no checkpoint between
  them. `event.message` is `Uncaught Error: boom` / `Uncaught str`. `onerror` receives
  `(message, source, lineno, colno, error)`.
- `unhandledrejection` listeners run in the notification task, after the report, with a checkpoint
  after each listener. `preventDefault` does not stop the report in the harness.
- `window === globalThis === self`, `String(window)` is `[object Window]`, `String(document)` is
  `[object HTMLDocument]`, a `div` is `[object HTMLDivElement]` with `tagName` `DIV`.
- `addEventListener('x')` with one argument: `TypeError: Failed to execute 'addEventListener' on
  'EventTarget': 2 arguments required, but only 1 present.`; a `null` listener is ignored.

## MessagePort transfer

- `postMessage(data, [port])` and `postMessage(data, { transfer: [port] })`: the receiver gets a new
  `MessagePort` in `event.ports` (not the same object), entangled with the old peer. The original
  port is neutered: it receives nothing and its posts go nowhere.
- Messages queued at the transferred port before the transfer arrive at the new port once it starts.
- Errors: duplicate port `Message port at index 1 is a duplicate of an earlier port.`; source port
  `Port at index 0 contains the source port.`; plain object `Value at index 0 does not have a
  transferable type.` (all `DataCloneError`, prefixed `Failed to execute 'postMessage' on
  'MessagePort': `).
- Transferring an `ArrayBuffer` detaches it on the sender (`byteLength` 0).

## fetch

- `fetch(data:...)`: the response task is queued at the call. Reading the body (`text()`, `json()`)
  resolves after **two** more task hops for `data:` URLs and after **one** hop for network
  responses. A second read rejects at once: `Failed to execute 'text' on 'Response': body stream
  already read`.
- Bad input rejects at once (not a throw): no argument
  `Failed to execute 'fetch' on 'Window': 1 argument required, but only 0 present.`; a relative URL
  on `about:blank` `Failed to execute 'fetch' on 'Window': Failed to parse URL from /x`.
- Unreachable host: `TypeError: Failed to fetch`.
- `data:` details: `status` 200, `ok`, `statusText` `"OK"`, `type` `"basic"`, `url` is the data URL,
  default content type `text/plain;charset=US-ASCII`, base64 supported, `POST` allowed.
- Network responses: `type` `"cors"`, `statusText` from the reason phrase (`Not Found`), a 404 still
  resolves (`ok` false). Two requests resolve in order of arrival (latency), not call order.

## Modules and import

- Module scripts: strict, `this` undefined, top-level `var` is not global, `import.meta.url` is
  `about:blank` for the inline module. Top-level await continues in microtasks and tasks like any
  async function.
- A module that throws (or whose top-level await rejects) is reported as an uncaught exception
  after the microtasks it queued (HTML reports on rejection of the evaluation promise).
- `import(data:text/javascript,...)`: one task queued at the call fetches, evaluates, and resolves;
  a second `import()` of the same URL evaluates once; importing an already loaded module still
  takes one task. A module with top-level await resolves `import()` after it finishes.
- Static `import` from a `data:` URL evaluates the dependency first.
- Errors: bare specifier from `import()` rejects at once with `Failed to resolve module specifier
  'lodash'. The base URL is about:blank because import() is called from a CORS-cross-origin
  script.`; static bare import is reported as `Failed to resolve module specifier "lodash". Relative
  references must start with either "/", "./", or "../".`; static relative import `Failed to resolve
  module specifier "./a.js". Invalid relative url or base scheme isn't hierarchical.`; an
  unreachable URL or a non-JavaScript MIME type `Failed to fetch dynamically imported module: <url>`.

## WeakRef, FinalizationRegistry, gc()

- `gc()` (only with `--expose-gc`) collects objects not kept alive; a `WeakRef` target created or
  dereferenced earlier in the same task is kept until the end of the microtask checkpoint
  (`gc()` in a microtask of the same task still finds it).
- A closure held by a pending timer keeps its captured objects alive.
- `gc()` queues the cleanup task at once; the task runs all cleanup callbacks back to back
  (microtasks after all of them), most recently registered first for two cells. With three cells the
  order **varies**. A throwing callback is reported and ends that task; the remaining cells are
  cleaned in a new task, after the microtasks (`cleanup b`, error, `micro b`, `cleanup a`).
  `unregister` works.

## SharedArrayBuffer and Atomics

- On a page that is not cross-origin isolated, `SharedArrayBuffer` is undefined and `Atomics` is an
  object. When isolated, `SharedArrayBuffer` exists; posting one shares memory (a new wrapper object
  over the same bytes).
- `Atomics.wait` on the window throws `TypeError: Atomics.wait cannot be called in this context`
  (also when the value differs). On a non-shared array `[object Int32Array] is not a shared typed
  array.`; on `Uint8Array` `[object Uint8Array] is not an int32 or BigInt64 typed array.`; on
  `Float32Array` `[object Float32Array] is not an integer typed array.`; bad index
  `RangeError: Invalid atomic access index`.
- `Atomics.waitAsync`: `not-equal` and timeout 0 answer synchronously; a `notify` queues the wake as
  a task. A finite timeout resolves about 5 ms late (10 ms timeout after a 14 ms timer); this delay
  is not modelled.

## Not modelled (and why)

- `DOMContentLoaded` / `load`: the recorder loads pages through `document.write`, which fires them
  synchronously; a real navigation differs, so the Oracle cannot pin them.
- `Atomics.waitAsync` with a finite positive timeout: Chrome's extra delay is unexplained.
- FinalizationRegistry cleanup order beyond two cells; order across several registries.
