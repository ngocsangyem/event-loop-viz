# The UI only replays an immutable, versioned Trace

The Worker runs the whole Script to Halt and returns one Trace: a JSON-serializable header (`schemaVersion`, engine name and commit, Host Profile, Budgets, source) plus frozen Trace Events with sequential `seq` numbers. The UI never drives the engine. UI state at position i is a pure fold of `trace[0..i]`, with snapshots every 500 events. That makes stepping backward, scrubbing, jumping by Tick or Task, shareable links, and golden-file tests trivial.

We rejected live stepping of the engine. It would make backward stepping require re-execution, couple the UI to engine262, and make results depend on interaction timing.

## Consequences

- Script input is fixed for a Run: editing the Script discards the Trace.
- Every Run must fit within its Budgets.
- Bookkeeping events are folded into the next Visible Event unless "show all events" is on.
- Individual AST node evaluations are not Trace Events. There would be millions of them. They only advance the Virtual Clock (ADR-0007) and the Budget. Events carry the source location being evaluated, plus a `cause` link to the event that triggered them.
- Share links carry the Script and settings, never the Trace. Runs are deterministic, so the recipient re-runs and gets an identical Trace, and no backend is needed.
