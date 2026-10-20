# Correctness is proven by differential testing against real Chrome

Every Script in the corpus runs both in the simulator and in real Chrome (Playwright `channel: 'chrome'`), and the two Observable Outputs must be equal (ADR-0002). The corpus has two parts:
- About 60 curated cases in `tests/differential/cases/`, from `docs/research/event-loop-semantics.md` plus the classic quiz programs.
- A seeded, grammar-based fuzzer. It mixes `then`, `await`, thenables, async generators, `queueMicrotask`, timers with safe delays (multiples of 10 ms), and `throw`/`reject`. It generates 200 programs per PR and 10,000 nightly.

When a mismatch is found, the Script is minimized automatically and added to the curated cases. A guard test fails if Chrome's major version differs from the pinned Host Profile. v1 ships only `chrome-155`.
