# Deterministic Budgets; exceeding one Halts with a truncated Trace

Runs are limited by counts, never by wall-clock time, so the same Script always stops at the same point. The defaults are configurable under advanced settings:
- 2,000,000 node evaluations
- 10,000 Tasks
- 60 s of virtual time
- 200,000 Trace Events

Exceeding a limit appends `run:halted {reason, limit}`, and the partial Trace is still replayable with a banner. A 30 s wall-clock watchdog that calls `worker.terminate()` is only a backstop; when it fires there is no Trace at all.
