# MessageChannel is supported in v1, gated on differential Fixtures

Supersedes the `MessageChannel` part of ADR-0006. `MessageChannel`, `port.postMessage`, `port.onmessage` (which implicitly starts the port), `port.start()` and `port.close()` move into v1 scope. The host adds a `port-message` task source. For the `chrome-155` Host Profile, the event loop picks Tasks across sources in FIFO order of enqueue time, and a 0 ms timer enqueues immediately. This is the observed Chrome 155 behavior in `docs/research/event-loop-semantics.md` §4.12: 10/10 trials in each registration order. Task-queue choice is implementation-defined, so this rule is not guaranteed by the HTML spec.

Because the rule rests on black-box observation, not on the spec, it ships only behind differential Fixtures. The Fixtures cover both registration orders (timer first, message first), plus a message posted from inside a Job and from inside a timer. All must match the Oracle across 5 recording runs. If any of them is non-deterministic in Chrome, `MessageChannel` goes back to throwing `UnsupportedApiError`.

## Considered Options

- **Keep it unsupported until v1.1 (ADR-0006):** rejected. `MessageChannel` is the standard way to schedule a fast macrotask (React's scheduler uses it), and learners ask about it next to `setTimeout(0)`.
- **Model separate task queues with a host-chosen priority:** rejected. The Oracle shows no priority, only registration order.

## Consequences

- `window.postMessage`, `addEventListener('message')`, and `MessagePort` transfer stay unsupported.
- A Chrome major bump must re-verify the cross-source FIFO rule, because a new Host Profile may change it.
