# "100% correct" means the Observable Output matches a pinned Chrome

A Run is correct when its Observable Output equals the Oracle's for the same Script. The Observable Output is: console lines whose arguments are rendered by one shared, canonical `formatValue()` (the test harness wraps `console.*` in Chrome with the same function, because DevTools' interactive object rendering cannot be compared), reported exceptions (`Uncaught …`), and unhandled-rejection reports (`Uncaught (in promise) …`), all in order. The Oracle is Chrome stable at the Host Profile's pinned major version, driven by Playwright. Only ordering is compared, never milliseconds: Chrome's real timing jitters, while the simulator runs on a Virtual Clock.

Chrome cannot expose its internal Jobs, frames, or promise states, so internal Trace Events are checked differently:
- engine262's spec fidelity
- the tick-count cases in `docs/research/event-loop-semantics.md`
- golden Traces committed under `tests/golden/`

Full trace equality with Chrome was rejected as impossible. Comparing timings was rejected as flaky.

## Consequences

Error semantics copy Chrome:
- An uncaught exception in a Task or Job is reported, and the Checkpoint and loop continue.
- A syntax error stops the Run before any Trace exists.
- Bumping the pinned Chrome major means a new Host Profile and a re-run of the differential suite.
- Differential tests skip Scripts whose ordering depends on compute time (ADR-0007) or that call `Math.random` (in the simulator it is seeded per Run, and the seed goes in the Trace header).
