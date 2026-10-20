# Carry a small additive patch on engine262 instead of inferring promise events

engine262 hands the host every promise Job as an opaque closure tagged only `'PromiseJobs'`. The functions that create Jobs (`NewPromiseReactionJob`, `NewPromiseResolveThenableJob`) are module-private, and there are no hooks for promise create, `then`, settle, Await, or async-generator yield/resume. We therefore carry a small `pnpm patch` (about 40–70 lines, additive and behind `if (hook)`) on the pinned commit. It adds:
- an `onPromiseEvent` host hook
- a `Job.meta` field carrying the job kind and the target promise

We also offer the change upstream. The call stack needs no patch: overriding `ExecutionContextStack` `push`/`pop` is enough.

Rejected: wrapping and inferring from outside (`job.toString()`, accessors on `PromiseState`, stack-shape heuristics). It breaks under minification or field renames and cannot label implicit awaits, and correctness cannot rest on heuristics (ADR-0002).

## Consequences

Every bump of the pinned engine262 commit has three steps:
1. Re-apply the patch.
2. Re-run the test262 baseline.
3. Re-run the golden Traces.

Rebases may conflict in `promise-operations.mts`, which upstream edits actively.

The prototype on `prototype/engine262-trace` confirmed what can't be hooked from outside:
- Job kind can only be guessed from `job.toString()`, and only in an unminified build.
- Fulfill vs reject and the target promise are unrecoverable.
- Await suspend can only be labelled after the fact, when the context is pushed again, so an await that never resumes looks like a return.
- An async generator's await and yield are indistinguishable.
- Promise create, `then` and settle are not observable at all.
